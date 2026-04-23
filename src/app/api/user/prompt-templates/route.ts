/**
 * 用户提示词模板管理接口
 *
 * GET  - 获取用户自定义模板配置
 * PUT  - 保存用户自定义模板配置
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import {
  getUserPromptTemplates,
  type UserPromptTemplates,
} from '@/lib/user-prompt-templates'
import {
  STYLE_CHARACTER_TEMPLATES,
  STYLE_LOCATION_TEMPLATES,
  STYLE_PROP_TEMPLATES,
  DEFAULT_CHARACTER_TEMPLATE,
  DEFAULT_LOCATION_TEMPLATE,
  DEFAULT_PROP_TEMPLATE,
  PROMPT_TEMPLATE_VARIABLES,
} from '@/lib/prompt-templates'
import { ART_STYLES, isArtStyleValue, type ArtStyleValue } from '@/lib/constants'

interface StyleTemplateGroup {
  value: ArtStyleValue
  label: string
  templates: {
    character: string
    location: string
    prop: string
  }
  variables: typeof PROMPT_TEMPLATE_VARIABLES
}

interface PromptTemplatesResponse {
  styles: StyleTemplateGroup[]
  userTemplates: UserPromptTemplates
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isStyleTemplatePayload(
  value: unknown,
): value is { characterTemplate?: string; locationTemplate?: string; propTemplate?: string } {
  if (!isRecord(value)) return false
  const { characterTemplate, locationTemplate, propTemplate } = value
  if (characterTemplate !== undefined && typeof characterTemplate !== 'string') return false
  if (locationTemplate !== undefined && typeof locationTemplate !== 'string') return false
  if (propTemplate !== undefined && typeof propTemplate !== 'string') return false
  return true
}

function normalizeUserTemplatesInput(raw: unknown): UserPromptTemplates {
  if (!isRecord(raw)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'TEMPLATE_PAYLOAD_INVALID',
      field: 'templates',
    })
  }

  const result: UserPromptTemplates = {}
  for (const [style, templatePayload] of Object.entries(raw)) {
    if (style !== 'default' && !isArtStyleValue(style)) {
      throw new ApiError('INVALID_PARAMS', {
        code: 'TEMPLATE_STYLE_INVALID',
        field: `templates.${style}`,
      })
    }
    if (!isStyleTemplatePayload(templatePayload)) {
      throw new ApiError('INVALID_PARAMS', {
        code: 'TEMPLATE_PAYLOAD_INVALID',
        field: `templates.${style}`,
      })
    }
    if (templatePayload.characterTemplate || templatePayload.locationTemplate || templatePayload.propTemplate) {
      result[style] = {
        characterTemplate: templatePayload.characterTemplate,
        locationTemplate: templatePayload.locationTemplate,
        propTemplate: templatePayload.propTemplate,
      }
    }
  }

  return result
}

export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult
  const userId = session.user.id

  const userTemplates = await getUserPromptTemplates(userId)

  const styles: StyleTemplateGroup[] = ART_STYLES.map((style) => ({
    value: style.value,
    label: style.label,
    templates: {
      character: STYLE_CHARACTER_TEMPLATES[style.value] || DEFAULT_CHARACTER_TEMPLATE,
      location: STYLE_LOCATION_TEMPLATES[style.value] || DEFAULT_LOCATION_TEMPLATE,
      prop: STYLE_PROP_TEMPLATES[style.value] || DEFAULT_PROP_TEMPLATE,
    },
    variables: PROMPT_TEMPLATE_VARIABLES,
  }))

  // 添加默认分组（用于用户设置全局默认模板）
  const defaultGroup: StyleTemplateGroup = {
    value: 'default' as ArtStyleValue,
    label: '默认模板',
    templates: {
      character: DEFAULT_CHARACTER_TEMPLATE,
      location: DEFAULT_LOCATION_TEMPLATE,
      prop: DEFAULT_PROP_TEMPLATE,
    },
    variables: PROMPT_TEMPLATE_VARIABLES,
  }

  const response: PromptTemplatesResponse = {
    styles: [defaultGroup, ...styles],
    userTemplates,
  }

  return NextResponse.json(response)
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

  if (!isRecord(body)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'TEMPLATE_PAYLOAD_INVALID',
      field: 'body',
    })
  }

  const userTemplates = normalizeUserTemplatesInput(body.templates)

  await prisma.userPreference.upsert({
    where: { userId },
    update: {
      promptStylePresets: Object.keys(userTemplates).length > 0
        ? JSON.stringify(userTemplates)
        : null,
    },
    create: {
      userId,
      promptStylePresets: Object.keys(userTemplates).length > 0
        ? JSON.stringify(userTemplates)
        : null,
    },
  })

  return NextResponse.json({ success: true })
})
