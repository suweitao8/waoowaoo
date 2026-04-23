import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  // 验证项目权限
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) {
    return authResult
  }

  try {
    // 获取项目数据
    const project = await prisma.novelPromotionProject.findUnique({
      where: { projectId },
      include: {
        episodes: {
          select: {
            name: true,
            novelText: true,
          },
          orderBy: { episodeNumber: 'asc' },
          take: 5, // 只取前5章进行分析
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 合并章节文本
    const novelContent = project.episodes
      .map(ep => `【${ep.name}】\n${ep.novelText || ''}`)
      .join('\n\n')

    if (!novelContent || novelContent.length < 100) {
      return NextResponse.json(
        { error: 'Novel content is too short for analysis' },
        { status: 400 }
      )
    }

    // 简单的分析逻辑（实际项目中可以接入 AI API）
    // 这里使用基于规则的分析作为示例
    const analysisResult = analyzeNovel(novelContent)

    // 保存到数据库
    const updatedProject = await prisma.novelPromotionProject.update({
      where: { projectId },
      data: {
        worldContext: analysisResult.worldContext,
        writingStyle: analysisResult.writingStyle,
        extractedCharacters: analysisResult.characters
          ? JSON.stringify(analysisResult.characters)
          : null,
      },
    })

    return NextResponse.json({
      success: true,
      analysis: {
        worldContext: updatedProject.worldContext,
        writingStyle: updatedProject.writingStyle,
        extractedCharacters: updatedProject.extractedCharacters,
      },
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}

// 基于规则的小说分析函数
function analyzeNovel(content: string) {
  // 提取世界观设定
  const worldContext = extractWorldContext(content)

  // 分析写作风格
  const writingStyle = extractWritingStyle(content)

  // 提取角色信息
  const characters = extractCharacters(content)

  return {
    worldContext,
    writingStyle,
    characters,
  }
}

function extractWorldContext(content: string): string {
  // 查找可能的世界观关键词
  const worldKeywords = ['世界', '大陆', '帝国', '王朝', '宗门', '门派', '修仙', '魔法', '科技', '时代', '年代']
  const foundKeywords: string[] = []

  for (const keyword of worldKeywords) {
    if (content.includes(keyword)) {
      foundKeywords.push(keyword)
    }
  }

  if (foundKeywords.length > 0) {
    return `故事背景包含：${foundKeywords.join('、')}等元素。具体世界观设定需要进一步阅读了解。`
  }

  return '现代或架空背景，具体世界观设定需要进一步阅读了解。'
}

function extractWritingStyle(content: string): string {
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

  return `${perspective}叙述，${style}。`
}

interface Character {
  name: string
  description: string
  relationships?: string
}

function extractCharacters(content: string): Character[] {
  // 简单的角色提取逻辑
  // 查找常见的人名模式
  const namePatterns = [
    /([一-龥]{2,4})(说|道|问|答|笑|哭|喊)/g,
    /「([^」]+)」([一-龥]{2,4})/g,
  ]

  const characterNames = new Set<string>()

  for (const pattern of namePatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1] || match[2]
      if (name && name.length >= 2 && name.length <= 4) {
        characterNames.add(name)
      }
    }
  }

  // 限制角色数量
  const names = Array.from(characterNames).slice(0, 10)

  return names.map(name => ({
    name,
    description: '主要角色',
    relationships: '',
  }))
}
