/**
 * 提示词模板配置 API
 *
 * GET  - 读取用户提示词模板配置
 * PUT  - 保存用户提示词模板配置
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'

interface PromptTemplatesPayload {
  characterPromptTemplate?: string
  locationPromptTemplate?: string
  propPromptTemplate?: string
}

function validatePromptTemplates(raw: unknown): PromptTemplatesPayload {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'PROMPT_TEMPLATES_INVALID',
      field: 'body',
    })
  }

  const body = raw as Record<string, unknown>
  const result: PromptTemplatesPayload = {}

  if (body.characterPromptTemplate !== undefined) {
    if (typeof body.characterPromptTemplate !== 'string') {
      throw new ApiError('INVALID_PARAMS', {
        code: 'PROMPT_TEMPLATE_INVALID',
        field: 'characterPromptTemplate',
      })
    }
    result.characterPromptTemplate = body.characterPromptTemplate
  }

  if (body.locationPromptTemplate !== undefined) {
    if (typeof body.locationPromptTemplate !== 'string') {
      throw new ApiError('INVALID_PARAMS', {
        code: 'PROMPT_TEMPLATE_INVALID',
        field: 'locationPromptTemplate',
      })
    }
    result.locationPromptTemplate = body.locationPromptTemplate
  }

  if (body.propPromptTemplate !== undefined) {
    if (typeof body.propPromptTemplate !== 'string') {
      throw new ApiError('INVALID_PARAMS', {
        code: 'PROMPT_TEMPLATE_INVALID',
        field: 'propPromptTemplate',
      })
    }
    result.propPromptTemplate = body.propPromptTemplate
  }

  return result
}

export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult
  const userId = session.user.id

  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      characterPromptTemplate: true,
      locationPromptTemplate: true,
      propPromptTemplate: true,
    },
  })

  return NextResponse.json({
    characterPromptTemplate: pref?.characterPromptTemplate || null,
    locationPromptTemplate: pref?.locationPromptTemplate || null,
    propPromptTemplate: pref?.propPromptTemplate || null,
  })
})

export const PUT = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult
  const userId = session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError('INVALID_PARAMS', {
      code: 'BODY_PARSE_FAILED',
      field: 'body',
    })
  }

  const templates = validatePromptTemplates(body)

  const updateData: Record<string, string | null> = {}

  if (templates.characterPromptTemplate !== undefined) {
    updateData.characterPromptTemplate = templates.characterPromptTemplate || null
  }
  if (templates.locationPromptTemplate !== undefined) {
    updateData.locationPromptTemplate = templates.locationPromptTemplate || null
  }
  if (templates.propPromptTemplate !== undefined) {
    updateData.propPromptTemplate = templates.propPromptTemplate || null
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.userPreference.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    })
  }

  return NextResponse.json({ success: true })
})
