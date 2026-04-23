import type { Job } from 'bullmq'
import { safeParseJsonObject } from '@/lib/json-repair'
import { prisma } from '@/lib/prisma'
import { executeAiTextStep } from '@/lib/ai-runtime'
import { withInternalLLMStreamCallbacks } from '@/lib/llm-observe/internal-stream-context'
import { reportTaskProgress } from '@/lib/workers/shared'
import { assertTaskActive } from '@/lib/workers/utils'
import { createWorkerLLMStreamCallbacks, createWorkerLLMStreamContext } from './llm-stream'
import type { TaskJobData } from '@/lib/task/types'
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'
import { resolveAnalysisModel } from './resolve-analysis-model'

function readText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseJsonResponse(responseText: string): Record<string, unknown> {
  return safeParseJsonObject(responseText)
}

/**
 * 写小说项目 AI 分析任务
 * 提取世界观、写作风格、角色信息
 */
export async function handleAnalyzeNovelWritingTask(job: Job<TaskJobData>) {
  const projectId = job.data.projectId

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!project) {
    throw new Error('Project not found')
  }

  const novelWritingData = await prisma.novelWritingProject.findUnique({
    where: { projectId },
    include: {
      episodes: {
        orderBy: { episodeNumber: 'asc' },
        select: {
          id: true,
          name: true,
          novelText: true,
        },
      },
    },
  })
  if (!novelWritingData) {
    throw new Error('Novel writing project not found')
  }

  const analysisModel = await resolveAnalysisModel({
    userId: job.data.userId,
    projectAnalysisModel: novelWritingData.analysisModel,
  })

  // 拼接所有章节内容
  let allContent = ''
  for (const ep of novelWritingData.episodes) {
    const text = readText(ep.novelText)
    if (!text.trim()) continue
    allContent += `【${ep.name}】\n${text}\n\n`
  }

  if (!allContent.trim()) {
    throw new Error('没有可分析的内容，请先添加章节')
  }

  // 限制内容长度
  const maxContentLength = 50000
  if (allContent.length > maxContentLength) {
    allContent = allContent.substring(0, maxContentLength)
  }

  await reportTaskProgress(job, 10, {
    stage: 'analyze_novel_writing_prepare',
    stageLabel: '准备分析参数',
    displayMode: 'detail',
    message: `分析 ${novelWritingData.episodes.length} 个章节`,
  })
  await assertTaskActive(job, 'analyze_novel_writing_prepare')

  // 构建分析提示词
  const analyzePromptTemplate = buildPrompt({
    promptId: PROMPT_IDS.NW_ANALYZE_PROJECT,
    locale: job.data.locale,
    variables: {
      input: allContent,
    },
  })

  const streamContext = createWorkerLLMStreamContext(job, 'analyze_novel_writing')
  const streamCallbacks = createWorkerLLMStreamCallbacks(job, streamContext)

  let completion
  try {
    completion = await withInternalLLMStreamCallbacks(
      streamCallbacks,
      async () =>
        await executeAiTextStep({
          userId: job.data.userId,
          model: analysisModel,
          messages: [{ role: 'user', content: analyzePromptTemplate }],
          temperature: 0.7,
          projectId,
          action: 'analyze_novel_writing',
          meta: {
            stepId: 'analyze_novel_writing',
            stepTitle: 'AI 分析',
            stepIndex: 1,
            stepTotal: 2,
          },
        }),
    )
  } finally {
    await streamCallbacks.flush()
  }

  const responseText = completion.text

  await reportTaskProgress(job, 60, {
    stage: 'analyze_novel_writing_llm_done',
    stageLabel: 'AI 分析完成',
    displayMode: 'detail',
  })

  // 解析响应
  const responseData = parseJsonResponse(responseText)
  const worldContext = readText(responseData.worldContext)
  const writingStyle = readText(responseData.writingStyle)
  const charactersRaw = responseData.characters

  // 处理角色数据
  let extractedCharacters = '[]'
  if (Array.isArray(charactersRaw)) {
    const characters = charactersRaw.map((item) => {
      const char = item as Record<string, unknown>
      return {
        name: readText(char.name),
        description: readText(char.description),
        relationships: readText(char.relationships),
      }
    }).filter((c) => c.name)
    extractedCharacters = JSON.stringify(characters)
  }

  await reportTaskProgress(job, 75, {
    stage: 'analyze_novel_writing_persist',
    stageLabel: '保存分析结果',
    displayMode: 'detail',
  })
  await assertTaskActive(job, 'analyze_novel_writing_persist')

  // 保存分析结果
  await prisma.novelWritingProject.update({
    where: { projectId },
    data: {
      worldContext,
      writingStyle,
      extractedCharacters,
    },
  })

  await reportTaskProgress(job, 96, {
    stage: 'analyze_novel_writing_done',
    stageLabel: '分析已完成',
    displayMode: 'detail',
  })

  return {
    success: true,
    analysis: {
      worldContext,
      writingStyle,
      extractedCharacters,
    },
  }
}
