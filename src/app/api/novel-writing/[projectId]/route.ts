import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'

// GET - 获取单个写小说项目
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
    },
    include: {
      project: true,
      episodes: {
        orderBy: { episodeNumber: 'asc' }
      },
      characters: {
        include: {
          appearances: {
            orderBy: { appearanceIndex: 'asc' }
          }
        }
      },
      locations: {
        include: {
          images: {
            orderBy: { imageIndex: 'asc' }
          }
        }
      }
    }
  })

  if (!novelWritingProject) {
    throw new ApiError('NOT_FOUND')
  }

  return NextResponse.json({
    project: novelWritingProject.project,
    novelWritingData: novelWritingProject
  })
})

// PATCH - 更新写小说项目
export const PATCH = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { projectId } = await context.params
  const body = await request.json()

  // 验证项目存在且属于用户
  const existing = await prisma.novelWritingProject.findFirst({
    where: {
      projectId,
      project: { userId: session.user.id }
    }
  })

  if (!existing) {
    throw new ApiError('NOT_FOUND')
  }

  // 更新项目
  const updateData: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    await prisma.project.update({
      where: { id: projectId },
      data: { name: body.name.trim() }
    })
  }
  if (typeof body.description === 'string') {
    await prisma.project.update({
      where: { id: projectId },
      data: { description: body.description.trim() || null }
    })
  }
  if (body.worldContext !== undefined) updateData.worldContext = body.worldContext
  if (body.writingStyle !== undefined) updateData.writingStyle = body.writingStyle
  if (body.artStyle !== undefined) updateData.artStyle = body.artStyle
  if (body.videoRatio !== undefined) updateData.videoRatio = body.videoRatio
  if (body.narratorVoiceId !== undefined) updateData.narratorVoiceId = body.narratorVoiceId
  if (body.narratorVoiceType !== undefined) updateData.narratorVoiceType = body.narratorVoiceType
  if (body.narratorVoicePrompt !== undefined) updateData.narratorVoicePrompt = body.narratorVoicePrompt

  if (Object.keys(updateData).length > 0) {
    await prisma.novelWritingProject.update({
      where: { projectId },
      data: updateData
    })
  }

  const updated = await prisma.novelWritingProject.findUnique({
    where: { projectId },
    include: { project: true }
  })

  return NextResponse.json({ project: updated?.project, novelWritingData: updated })
})

// DELETE - 删除写小说项目
export const DELETE = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { projectId } = await context.params

  // 验证项目存在且属于用户
  const existing = await prisma.novelWritingProject.findFirst({
    where: {
      projectId,
      project: { userId: session.user.id }
    }
  })

  if (!existing) {
    throw new ApiError('NOT_FOUND')
  }

  // 删除项目（级联删除相关数据）
  await prisma.project.delete({
    where: { id: projectId }
  })

  return NextResponse.json({ success: true })
})
