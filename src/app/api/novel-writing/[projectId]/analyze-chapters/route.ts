import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ApiError } from '@/lib/api-errors'

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

interface AnalyzeRequest {
  chapterIds: string[]
}

// 分析世界观的函数
function extractWorldContext(content: string): object {
  // 查找可能的世界观关键词
  const worldKeywords = ['世界', '大陆', '帝国', '王朝', '宗门', '门派', '修仙', '魔法', '科技', '时代', '年代']
  const foundKeywords: string[] = []

  for (const keyword of worldKeywords) {
    if (content.includes(keyword)) {
      foundKeywords.push(keyword)
    }
  }

  return {
    scenes: foundKeywords.length > 0
      ? [{ type: 'background', description: `故事背景包含：${foundKeywords.join('、')}等元素` }]
      : [{ type: 'background', description: '现代或架空背景' }],
    rules: [],
    factions: [],
    concepts: [],
  }
}

// 分析写作风格的函数
function extractWritingStyle(content: string): object {
  // 分析叙述视角
  let perspective = '第三人称'
  if (content.includes('我') && content.split('我').length > content.length / 100) {
    perspective = '第一人称'
  }

  // 分析语言特点
  const dialogCount = (content.match(/[「"]/g) || []).length
  const descriptionRatio = dialogCount / content.length

  let style = '叙述平实'
  if (descriptionRatio > 0.02) {
    style = '对话丰富，节奏明快'
  } else if (descriptionRatio < 0.005) {
    style = '描写细腻，叙事舒缓'
  }

  return {
    perspective,
    languageStyle: style,
    pacing: descriptionRatio > 0.015 ? '快节奏' : '慢节奏',
    tone: '中性',
    dialogueStyle: dialogCount > 50 ? '对话多' : '对话少',
  }
}

export const POST = apiHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { projectId } = await context.params
  const body: AnalyzeRequest = await request.json()
  const { chapterIds } = body

  if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
    throw new ApiError('INVALID_PARAMS', { message: '请选择要分析的章节' })
  }

  // 获取项目
  const novelWritingProject = await prisma.novelWritingProject.findFirst({
    where: {
      projectId,
      project: { userId: session.user.id }
    }
  })

  if (!novelWritingProject) {
    throw new ApiError('NOT_FOUND', { message: '项目不存在' })
  }

  // 获取要分析的章节
  const chapters = await prisma.novelWritingEpisode.findMany({
    where: {
      id: { in: chapterIds },
      novelWritingProjectId: novelWritingProject.id,
    }
  })

  if (chapters.length === 0) {
    throw new ApiError('NOT_FOUND', { message: '未找到要分析的章节' })
  }

  // 更新章节状态为分析中
  await prisma.novelWritingEpisode.updateMany({
    where: { id: { in: chapterIds } },
    data: { analysisStatus: 'analyzing' }
  })

  try {
    // 分析每个章节
    const analysisResults = []

    for (const chapter of chapters) {
      const content = chapter.novelText || ''

      if (content.length < 100) {
        // 内容太短，跳过分析
        await prisma.novelWritingEpisode.update({
          where: { id: chapter.id },
          data: {
            analysisStatus: 'failed',
          }
        })
        continue
      }

      // 执行分析
      const worldContext = extractWorldContext(content)
      const writingStyle = extractWritingStyle(content)

      // 保存分析结果
      await prisma.novelWritingEpisode.update({
        where: { id: chapter.id },
        data: {
          worldContext: JSON.stringify(worldContext),
          writingStyle: JSON.stringify(writingStyle),
          analysisStatus: 'completed',
          analyzedAt: new Date(),
        }
      })

      analysisResults.push({
        id: chapter.id,
        name: chapter.name,
        worldContext,
        writingStyle,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        analyzedCount: analysisResults.length,
        chapters: analysisResults,
      }
    })
  } catch (error) {
    // 分析失败，恢复状态
    await prisma.novelWritingEpisode.updateMany({
      where: { id: { in: chapterIds } },
      data: { analysisStatus: 'failed' }
    })

    console.error('Analysis error:', error)
    throw new ApiError('INTERNAL_ERROR', { message: '分析失败' })
  }
})
