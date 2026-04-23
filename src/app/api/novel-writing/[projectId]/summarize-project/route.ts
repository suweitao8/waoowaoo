import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ApiError } from '@/lib/api-errors'

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

// 汇总世界观的函数
function summarizeWorldContext(contexts: object[]): object {
  const allScenes: object[] = []
  const allRules: object[] = []
  const allFactions: object[] = []
  const allConcepts: object[] = []

  for (const ctx of contexts) {
    const c = ctx as { scenes?: object[]; rules?: object[]; factions?: object[]; concepts?: object[] }
    if (c.scenes) allScenes.push(...c.scenes)
    if (c.rules) allRules.push(...c.rules)
    if (c.factions) allFactions.push(...c.factions)
    if (c.concepts) allConcepts.push(...c.concepts)
  }

  return {
    scenes: allScenes,
    rules: allRules,
    factions: allFactions,
    concepts: allConcepts,
    summary: `汇总自 ${contexts.length} 个章节的世界观设定`,
  }
}

// 汇总写作风格的函数
function summarizeWritingStyle(styles: object[]): object {
  const perspectives = new Set<string>()
  const languageStyles = new Set<string>()
  const pacings = new Set<string>()
  const tones = new Set<string>()

  for (const style of styles) {
    const s = style as { perspective?: string; languageStyle?: string; pacing?: string; tone?: string }
    if (s.perspective) perspectives.add(s.perspective)
    if (s.languageStyle) languageStyles.add(s.languageStyle)
    if (s.pacing) pacings.add(s.pacing)
    if (s.tone) tones.add(s.tone)
  }

  return {
    perspective: Array.from(perspectives).join(' / '),
    languageStyle: Array.from(languageStyles).join(' / '),
    pacing: Array.from(pacings).join(' / '),
    tone: Array.from(tones).join(' / '),
    dialogueStyle: '综合对话风格',
    summary: `汇总自 ${styles.length} 个章节的写作风格分析`,
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

  // 获取项目
  const novelWritingProject = await prisma.novelWritingProject.findFirst({
    where: {
      projectId,
      project: { userId: session.user.id }
    },
    include: {
      episodes: {
        where: { analysisStatus: 'completed' },
        select: {
          id: true,
          worldContext: true,
          writingStyle: true,
        }
      }
    }
  })

  if (!novelWritingProject) {
    throw new ApiError('NOT_FOUND', { message: '项目不存在' })
  }

  const analyzedEpisodes = novelWritingProject.episodes

  if (analyzedEpisodes.length === 0) {
    throw new ApiError('INVALID_PARAMS', { message: '没有已分析的章节，请先分析章节' })
  }

  // 收集所有章节的分析结果
  const worldContexts: object[] = []
  const writingStyles: object[] = []

  for (const episode of analyzedEpisodes) {
    if (episode.worldContext) {
      try {
        worldContexts.push(JSON.parse(episode.worldContext))
      } catch {
        // 忽略解析错误
      }
    }
    if (episode.writingStyle) {
      try {
        writingStyles.push(JSON.parse(episode.writingStyle))
      } catch {
        // 忽略解析错误
      }
    }
  }

  // 汇总
  const summarizedWorldContext = summarizeWorldContext(worldContexts)
  const summarizedWritingStyle = summarizeWritingStyle(writingStyles)

  // 保存到项目
  await prisma.novelWritingProject.update({
    where: { id: novelWritingProject.id },
    data: {
      worldContext: JSON.stringify(summarizedWorldContext),
      writingStyle: JSON.stringify(summarizedWritingStyle),
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      worldContext: summarizedWorldContext,
      writingStyle: summarizedWritingStyle,
      summarizedChapterCount: analyzedEpisodes.length,
    }
  })
})
