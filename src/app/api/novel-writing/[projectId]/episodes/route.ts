import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'

// GET - 获取剧集列表
export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { projectId } = await context.params

  const novelWritingProject = await prisma.novelWritingProject.findFirst({
    where: {
      projectId,
      project: { userId: session.user.id }
    }
  })

  if (!novelWritingProject) {
    throw new ApiError('NOT_FOUND')
  }

  const episodes = await prisma.novelWritingEpisode.findMany({
    where: { novelWritingProjectId: novelWritingProject.id },
    orderBy: { episodeNumber: 'asc' }
  })

  return NextResponse.json({ episodes })
})

// POST - 创建剧集
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { projectId } = await context.params
  const body = await request.json()

  const novelWritingProject = await prisma.novelWritingProject.findFirst({
    where: {
      projectId,
      project: { userId: session.user.id }
    }
  })

  if (!novelWritingProject) {
    throw new ApiError('NOT_FOUND')
  }

  // 获取下一个剧集编号
  const maxEpisode = await prisma.novelWritingEpisode.findFirst({
    where: { novelWritingProjectId: novelWritingProject.id },
    orderBy: { episodeNumber: 'desc' },
    select: { episodeNumber: true }
  })
  const episodeNumber = (maxEpisode?.episodeNumber || 0) + 1

  const episode = await prisma.novelWritingEpisode.create({
    data: {
      novelWritingProjectId: novelWritingProject.id,
      episodeNumber,
      name: body.name || `第${episodeNumber}章`,
      description: body.description || null,
      novelText: body.novelText || null,
    }
  })

  return NextResponse.json({ episode }, { status: 201 })
})
