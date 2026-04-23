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
  getUserPromptConfig,
  type UserPromptConfig,
} from '@/lib/user-prompt-templates'
import {
  DEFAULT_STYLE_PROMPTS,
  DEFAULT_TEMPLATE_TYPE_PROMPTS,
  TEMPLATE_TYPE_VARIABLES,
  type TemplateType,
} from '@/lib/prompt-templates'
import { ART_STYLES, isArtStyleValue, type ArtStyleValue } from '@/lib/constants'

// ========== 响应类型 ==========

interface StylePromptItem {
  value: ArtStyleValue
  label: string
  defaultPrompt: string
  userPrompt?: string
}

interface TemplateTypeItem {
  value: TemplateType
  label: string
  defaultTemplate: string
  userTemplate?: string
  variables: Array<{ name: string; description: string }>
}

interface PromptTemplatesResponse {
  styles: StylePromptItem[]
  templateTypes: TemplateTypeItem[]
}

// ========== 辅助函数 ==========

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

// ========== GET 接口 ==========

export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult
  const userId = session.user.id

  const userConfig = await getUserPromptConfig(userId)

  // 构建风格列表
  const styles: StylePromptItem[] = ART_STYLES.map((style) => ({
    value: style.value,
    label: style.label,
    defaultPrompt: DEFAULT_STYLE_PROMPTS[style.value],
    userPrompt: userConfig.stylePrompts?.[style.value],
  }))

  // 构建模板类型列表
  const templateTypeLabels: Record<TemplateType, string> = {
    character: '角色模板',
    location: '场景模板',
    prop: '道具模板',
  }

  const templateTypes: TemplateTypeItem[] = (['character', 'location', 'prop'] as const).map(
    (type) => ({
      value: type,
      label: templateTypeLabels[type],
      defaultTemplate: DEFAULT_TEMPLATE_TYPE_PROMPTS[type],
      userTemplate: userConfig.templateTypePrompts?.[type],
      variables: TEMPLATE_TYPE_VARIABLES[type],
    })
  )

  const response: PromptTemplatesResponse = {
    styles,
    templateTypes,
  }

  return NextResponse.json(response)
})

// ========== PUT 接口 ==========

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

  // 验证 stylePrompts
  const stylePrompts: Partial<Record<ArtStyleValue, string>> = {}
  if (body.stylePrompts && isRecord(body.stylePrompts)) {
    for (const [style, prompt] of Object.entries(body.stylePrompts)) {
      if (!isArtStyleValue(style)) {
        throw new ApiError('INVALID_PARAMS', {
          code: 'TEMPLATE_STYLE_INVALID',
          field: `stylePrompts.${style}`,
        })
      }
      if (typeof prompt !== 'string') {
        throw new ApiError('INVALID_PARAMS', {
          code: 'TEMPLATE_PROMPT_INVALID',
          field: `stylePrompts.${style}`,
        })
      }
      stylePrompts[style] = prompt
    }
  }

  // 验证 templateTypePrompts
  const templateTypePrompts: Partial<Record<TemplateType, string>> = {}
  if (body.templateTypePrompts && isRecord(body.templateTypePrompts)) {
    for (const [type, template] of Object.entries(body.templateTypePrompts)) {
      if (!['character', 'location', 'prop'].includes(type)) {
        throw new ApiError('INVALID_PARAMS', {
          code: 'TEMPLATE_TYPE_INVALID',
          field: `templateTypePrompts.${type}`,
        })
      }
      if (typeof template !== 'string') {
        throw new ApiError('INVALID_PARAMS', {
          code: 'TEMPLATE_PROMPT_INVALID',
          field: `templateTypePrompts.${type}`,
        })
      }
      templateTypePrompts[type as TemplateType] = template
    }
  }

  const userConfig: UserPromptConfig = {}
  if (Object.keys(stylePrompts).length > 0) {
    userConfig.stylePrompts = stylePrompts
  }
  if (Object.keys(templateTypePrompts).length > 0) {
    userConfig.templateTypePrompts = templateTypePrompts
  }

  await prisma.userPreference.upsert({
    where: { userId },
    update: {
      promptStylePresets: Object.keys(userConfig).length > 0
        ? JSON.stringify(userConfig)
        : null,
    },
    create: {
      userId,
      promptStylePresets: Object.keys(userConfig).length > 0
        ? JSON.stringify(userConfig)
        : null,
    },
  })

  return NextResponse.json({ success: true })
})
