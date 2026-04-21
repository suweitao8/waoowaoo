import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildAudiobookTimeline, type VoiceLineForBuild, type PanelForBuild } from '@/features/video-editor/utils/audiobook-builder'
import { getSignedUrl } from '@/lib/storage'

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

  // 解析请求体
  const body = await request.json().catch(() => ({}))
  const fps = body.fps || 12
  const width = body.width || 1920
  const height = body.height || 1080

  // 查询配音数据
  const voiceLines = await prisma.novelPromotionVoiceLine.findMany({
    where: { episodeId },
    select: {
      id: true,
      speaker: true,
      content: true,
      audioUrl: true,
      audioDuration: true,
      matchedPanelId: true,
    },
    orderBy: { lineIndex: 'asc' },
  })

  if (voiceLines.length === 0) {
    return NextResponse.json({ error: 'No voice lines found' }, { status: 400 })
  }

  // 获取所有关联的 panel ID
  const panelIds = voiceLines
    .map(vl => vl.matchedPanelId)
    .filter((id): id is string => id !== null)

  // 查询分镜数据
  const panels = await prisma.novelPromotionPanel.findMany({
    where: { id: { in: panelIds } },
    select: {
      id: true,
      imageUrl: true,
      imageMediaId: true,
    },
  })

  // 构建 panel Map
  const panelMap = new Map<string, PanelForBuild>()

  for (const panel of panels) {
    let imageUrl = panel.imageUrl

    // 如果有 mediaId，获取签名 URL
    if (panel.imageMediaId && imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = await getSignedUrl(imageUrl, 3600)
      } catch {
        // 忽略签名失败
      }
    }

    panelMap.set(panel.id, {
      id: panel.id,
      imageUrl,
    })
  }

  // 准备配音数据
  const voiceLinesForBuild: VoiceLineForBuild[] = voiceLines.map(vl => ({
    id: vl.id,
    speaker: vl.speaker,
    content: vl.content,
    audioUrl: vl.audioUrl,
    audioDuration: vl.audioDuration,
    matchedPanelId: vl.matchedPanelId,
  }))

  // 构建时间轴
  const timeline = buildAudiobookTimeline(voiceLinesForBuild, panelMap, fps)

  if (timeline.length === 0) {
    return NextResponse.json({ error: 'No valid clips generated' }, { status: 400 })
  }

  // 构建编辑器项目数据
  const editorProjectData = {
    id: `editor_${Date.now()}`,
    episodeId,
    schemaVersion: '1.0' as const,
    config: { fps, width, height },
    timeline,
    bgmTrack: [],
  }

  // 保存到数据库
  const existingProject = await prisma.videoEditorProject.findUnique({
    where: { episodeId },
  })

  let savedProject
  if (existingProject) {
    savedProject = await prisma.videoEditorProject.update({
      where: { episodeId },
      data: {
        projectData: JSON.stringify(editorProjectData),
        renderStatus: null,
        renderTaskId: null,
        outputUrl: null,
      },
    })
  } else {
    savedProject = await prisma.videoEditorProject.create({
      data: {
        episodeId,
        projectData: JSON.stringify(editorProjectData),
      },
    })
  }

  return NextResponse.json({
    success: true,
    editorProject: {
      ...editorProjectData,
      id: savedProject.id,
    },
  })
}
