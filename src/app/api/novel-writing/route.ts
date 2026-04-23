import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { resolveTaskLocale } from '@/lib/task/resolve-locale'
import {
  formatProjectValidationIssue,
  normalizeProjectDraft,
  validateProjectDraft,
  type ProjectDraftInput,
} from '@/lib/projects/validation'

const PAGE_SIZE = 12

function readProjectDraftBody(body: unknown): ProjectDraftInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { name: '' }
  }
  const payload = body as Record<string, unknown>
  return {
    name: typeof payload.name === 'string' ? payload.name : '',
    description: typeof payload.description === 'string' ? payload.description : null,
  }
}

// GET - 获取写小说项目列表
export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || PAGE_SIZE.toString(), 10)
  const search = searchParams.get('search') || ''

  // 构建查询条件
  const where: Record<string, unknown> = { project: { userId: session.user.id } }
  if (search.trim()) {
    where.project = {
      userId: session.user.id,
      OR: [
        { name: { contains: search.trim() } },
        { description: { contains: search.trim() } }
      ]
    }
  }

  // 并行查询
  const [total, novelWritingProjects] = await Promise.all([
    prisma.novelWritingProject.count({ where }),
    prisma.novelWritingProject.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        project: true,
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          select: {
            id: true,
            name: true,
            novelText: true,
          }
        },
        _count: {
          select: {
            episodes: true,
            characters: true,
            locations: true
          }
        }
      }
    })
  ])

  // 格式化返回数据
  const projects = novelWritingProjects.map(nw => ({
    id: nw.project.id,
    name: nw.project.name,
    description: nw.project.description,
    createdAt: nw.project.createdAt,
    updatedAt: nw.project.updatedAt,
    novelWritingData: {
      id: nw.id,
      projectId: nw.projectId,
      worldContext: nw.worldContext,
      writingStyle: nw.writingStyle,
      artStyle: nw.artStyle,
      videoRatio: nw.videoRatio,
      episodes: nw.episodes,
      episodeCount: nw._count.episodes,
      characterCount: nw._count.characters,
      locationCount: nw._count.locations,
    }
  }))

  return NextResponse.json({
    projects,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  })
})

// POST - 创建写小说项目
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json()
  const draft = readProjectDraftBody(body)
  const validationIssue = validateProjectDraft(draft)
  if (validationIssue) {
    const locale = resolveTaskLocale(request, body) ?? 'zh'
    throw new ApiError('INVALID_PARAMS', {
      code: validationIssue.code,
      field: validationIssue.field,
      message: formatProjectValidationIssue(validationIssue, locale),
    })
  }

  const { name, description } = normalizeProjectDraft(draft)

  // 获取用户偏好配置
  const userPreference = await prisma.userPreference.findUnique({
    where: { userId: session.user.id }
  })

  // 创建基础项目
  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      userId: session.user.id
    }
  })

  // 创建写小说项目数据
  const novelWritingProject = await prisma.novelWritingProject.create({
    data: {
      projectId: project.id,
      ...(userPreference && {
        analysisModel: userPreference.analysisModel,
        audioModel: userPreference.audioModel,
        videoRatio: userPreference.videoRatio || '16:9',
        artStyle: userPreference.artStyle || 'realistic',
      }),
      // 如果有小说内容，设置世界观等
      ...(body.worldContext && { worldContext: body.worldContext }),
      ...(body.writingStyle && { writingStyle: body.writingStyle }),
    }
  })

  return NextResponse.json({ project, novelWritingProject }, { status: 201 })
})
