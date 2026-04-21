/**
 * ComfyUI 角色生成 API
 * 两步流程：1. 从文本生成角色档案 2. 从角色档案生成视觉描述
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { resolveModelSelectionOrSingle } from '@/lib/api-config'
import { ApiError, apiHandler } from '@/lib/api-errors'
import { executeAiTextStep } from '@/lib/ai-runtime'
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'
import { safeParseJsonObject } from '@/lib/json-repair'
import { resolveTaskLocale } from '@/lib/task/resolve-locale'

// 角色档案数据结构（简化版）
interface CharacterProfile {
  name: string
  gender: string
  age_range: string
  role_level: 'S' | 'A' | 'B' | 'C' | 'D'
  archetype: string
  personality_tags: string[]
  era_period: string
  social_class: string
  occupation?: string
  costume_tier: number
  suggested_colors: string[]
  primary_identifier?: string
  visual_keywords: string[]
}

interface CharacterAppearance {
  descriptions: string[]
}

export const POST = apiHandler(async (request: NextRequest) => {
  // 验证用户身份
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json()
  const { description, name = '角色' } = body

  if (!description || typeof description !== 'string') {
    throw new ApiError('INVALID_PARAMS', { message: '请输入角色描述' })
  }

  // 获取用户的分析模型配置
  const modelSelection = await resolveModelSelectionOrSingle(session.user.id, undefined, 'llm')

  if (!modelSelection) {
    throw new ApiError('INVALID_PARAMS', {
      message: '请先在设置页面配置分析模型',
    })
  }

  // 获取语言设置
  const locale = resolveTaskLocale(request, body) || 'zh'
  const model = `${modelSelection.provider}::${modelSelection.modelId}`

  // ========== 第一步：生成角色档案 ==========
  const profilePrompt = buildPrompt({
    promptId: PROMPT_IDS.COMFYUI_CHARACTER_PROFILE,
    locale,
    variables: {
      input: `角色名：${name}\n\n角色描述：${description}`,
      characters_lib_info: '[]', // 空的已有角色库
    },
  })

  const profileCompletion = await executeAiTextStep({
    userId: session.user.id,
    model,
    messages: [{ role: 'user', content: profilePrompt }],
    temperature: 0.7,
    projectId: 'comfyui',
    action: 'comfyui_generate_character_profile',
    meta: {
      stepId: 'generate_profile',
      stepTitle: '生成角色档案',
      stepIndex: 1,
      stepTotal: 2,
    },
  })

  const profileResponse = profileCompletion.text
  if (!profileResponse) {
    throw new ApiError('INTERNAL_ERROR', { message: '角色档案生成失败' })
  }

  let profileData: Record<string, unknown>
  try {
    profileData = safeParseJsonObject(profileResponse)
  } catch {
    throw new ApiError('INTERNAL_ERROR', { message: '角色档案格式错误' })
  }

  // 提取新角色
  const newCharacters = (profileData.new_characters || []) as Array<CharacterProfile>
  if (newCharacters.length === 0) {
    throw new ApiError('INTERNAL_ERROR', { message: '未能识别角色' })
  }

  const character = newCharacters[0]

  // ========== 第二步：生成视觉描述 ==========
  const visualPrompt = buildPrompt({
    promptId: PROMPT_IDS.COMFYUI_CHARACTER_VISUAL,
    locale,
    variables: {
      character_profiles: JSON.stringify(
        [
          {
            ...character,
            expected_appearances: [{ id: 0, change_reason: '初始形象' }],
          },
        ],
        null,
        2,
      ),
    },
  })

  const visualCompletion = await executeAiTextStep({
    userId: session.user.id,
    model,
    messages: [{ role: 'user', content: visualPrompt }],
    temperature: 0.7,
    projectId: 'comfyui',
    action: 'comfyui_generate_character_visual',
    meta: {
      stepId: 'generate_visual',
      stepTitle: '生成视觉描述',
      stepIndex: 2,
      stepTotal: 2,
    },
  })

  const visualResponse = visualCompletion.text
  if (!visualResponse) {
    throw new ApiError('INTERNAL_ERROR', { message: '视觉描述生成失败' })
  }

  let visualData: Record<string, unknown>
  try {
    visualData = safeParseJsonObject(visualResponse)
  } catch {
    throw new ApiError('INTERNAL_ERROR', { message: '视觉描述格式错误' })
  }

  // 提取视觉描述
  const visualCharacters = (visualData.characters || []) as Array<{ appearances: CharacterAppearance[] }>
  const firstCharacter = visualCharacters[0]
  const appearances = firstCharacter?.appearances || []
  const firstAppearance = appearances[0]
  const descriptions = firstAppearance?.descriptions || []

  if (descriptions.length === 0) {
    throw new ApiError('INTERNAL_ERROR', { message: '未能生成视觉描述' })
  }

  return NextResponse.json({
    success: true,
    profile: character,
    visualDescriptions: descriptions,
    recommendedPrompt: descriptions[0],
  })
})
