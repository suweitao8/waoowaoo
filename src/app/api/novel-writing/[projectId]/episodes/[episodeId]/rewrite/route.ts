import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    projectId: string
    episodeId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId, episodeId } = await params

  // 验证项目权限
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) {
    return authResult
  }

  try {
    const body = await request.json()
    const { instruction } = body

    if (!instruction || typeof instruction !== 'string') {
      return NextResponse.json(
        { error: '请提供改写指令' },
        { status: 400 }
      )
    }

    // 获取章节数据
    const episode = await prisma.novelPromotionEpisode.findFirst({
      where: {
        id: episodeId,
        novelPromotionProjectId: projectId,
      },
    })

    if (!episode) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 })
    }

    if (!episode.novelText || episode.novelText.length < 10) {
      return NextResponse.json(
        { error: '章节内容太短，无法改写' },
        { status: 400 }
      )
    }

    // 获取项目的分析数据
    const project = await prisma.novelPromotionProject.findUnique({
      where: { projectId },
      select: {
        worldContext: true,
        writingStyle: true,
        extractedCharacters: true,
      },
    })

    // 执行改写（这里使用基于规则的改写作为示例）
    const rewrittenText = rewriteNovelText(
      episode.novelText,
      instruction,
      {
        worldContext: project?.worldContext,
        writingStyle: project?.writingStyle,
        characters: project?.extractedCharacters,
      }
    )

    return NextResponse.json({
      success: true,
      originalText: episode.novelText,
      rewrittenText,
    })
  } catch (error) {
    console.error('Rewrite error:', error)
    return NextResponse.json(
      { error: '改写失败' },
      { status: 500 }
    )
  }
}

// 应用改写结果
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId, episodeId } = await params

  // 验证项目权限
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) {
    return authResult
  }

  try {
    const body = await request.json()
    const { newText } = body

    if (!newText || typeof newText !== 'string') {
      return NextResponse.json(
        { error: '请提供新的章节内容' },
        { status: 400 }
      )
    }

    // 获取当前章节
    const episode = await prisma.novelPromotionEpisode.findFirst({
      where: {
        id: episodeId,
        novelPromotionProjectId: projectId,
      },
    })

    if (!episode) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 })
    }

    // 构建改写历史记录
    const historyEntry = {
      timestamp: new Date().toISOString(),
      originalText: episode.novelText,
      newText: newText,
    }

    let rewriteHistory: unknown[] = []
    try {
      rewriteHistory = episode.rewriteHistory ? JSON.parse(episode.rewriteHistory) : []
    } catch {
      rewriteHistory = []
    }

    // 更新章节
    const updatedEpisode = await prisma.novelPromotionEpisode.update({
      where: { id: episodeId },
      data: {
        novelText: newText,
        originalText: episode.originalText || episode.novelText, // 保留第一次的原文
        rewriteHistory: JSON.stringify([...rewriteHistory, historyEntry]),
      },
    })

    return NextResponse.json({
      success: true,
      episode: {
        id: updatedEpisode.id,
        novelText: updatedEpisode.novelText,
      },
    })
  } catch (error) {
    console.error('Apply rewrite error:', error)
    return NextResponse.json(
      { error: '应用改写失败' },
      { status: 500 }
    )
  }
}

// 基于规则的改写函数
interface RewriteContext {
  worldContext?: string | null
  writingStyle?: string | null
  characters?: string | null
}

function rewriteNovelText(
  originalText: string,
  instruction: string,
  // context 参数保留用于未来接入真正的 AI API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: RewriteContext
): string {
  // 这里是一个示例改写逻辑
  // 实际项目中应该接入真正的 AI API

  let result = originalText

  // 根据指令类型进行不同的处理
  const instructionLower = instruction.toLowerCase()

  // 简化描述
  if (instructionLower.includes('简化') || instructionLower.includes('精简')) {
    result = simplifyText(result)
  }

  // 丰富描写
  if (instructionLower.includes('丰富') || instructionLower.includes('扩充')) {
    result = enrichText(result)
  }

  // 改变语气
  if (instructionLower.includes('轻松') || instructionLower.includes('幽默')) {
    result = adjustTone(result, 'light')
  }

  if (instructionLower.includes('严肃') || instructionLower.includes('正经')) {
    result = adjustTone(result, 'serious')
  }

  // 增加对话
  if (instructionLower.includes('对话') || instructionLower.includes('增加互动')) {
    result = addDialogue(result)
  }

  // 添加改写说明标记（实际使用时移除）
  const header = `【AI 改写提示：以下内容已根据指令"${instruction}"进行调整】\n\n`

  return header + result
}

function simplifyText(text: string): string {
  // 移除重复的形容词
  const lines = text.split('\n')
  const simplified = lines.map(line => {
    // 简单示例：移除一些常见的修饰词
    return line
      .replace(/非常|十分|特别|极其/g, '')
      .replace(/大概|可能|也许/g, '')
      .replace(/(.)\1{2,}/g, '$1$1') // 减少重复字
  })

  return simplified.join('\n')
}

function enrichText(text: string): string {
  // 为句子添加描述
  const lines = text.split('\n')
  const enriched = lines.map(line => {
    if (line.trim().length < 5) return line

    // 添加一些描述性词语（简单示例）
    if (line.includes('说')) {
      return line.replace('说', '缓缓说道')
    }
    if (line.includes('走')) {
      return line.replace('走', '慢慢走')
    }
    if (line.includes('看')) {
      return line.replace('看', '仔细看')
    }

    return line
  })

  return enriched.join('\n')
}

function adjustTone(text: string, tone: 'light' | 'serious'): string {
  if (tone === 'light') {
    return text
      .replace(/。/g, '哈。')
      .replace(/！/g, '呢！')
      .replace(/？/g, '嘛？')
  } else {
    return text
      .replace(/哈。/g, '。')
      .replace(/呢！/g, '！')
      .replace(/嘛？/g, '？')
      .replace(/呀/g, '')
      .replace(/吧/g, '')
  }
}

function addDialogue(text: string): string {
  // 找到叙述段落，尝试添加对话
  const paragraphs = text.split('\n\n')
  const result = paragraphs.map(p => {
    // 如果已经是对话，保持不变
    if (p.includes('「') || p.includes('"')) {
      return p
    }

    // 如果段落较长，在中间添加一句对话
    if (p.length > 50) {
      const midPoint = p.indexOf('。', p.length / 3)
      if (midPoint > 0) {
        const dialogue = '\n\n「这事你怎么看？」\n\n'
        return p.slice(0, midPoint + 1) + dialogue + p.slice(midPoint + 1)
      }
    }

    return p
  })

  return result.join('\n\n')
}
