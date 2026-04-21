/**
 * 提示词优化 API
 * 使用项目的 prompt-i18n 系统优化文生图提示词
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { resolveModelSelectionOrSingle } from '@/lib/api-config'
import { ApiError, apiHandler } from '@/lib/api-errors'
import { executeAiTextStep } from '@/lib/ai-runtime'
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'
import { safeParseJsonObject } from '@/lib/json-repair'
import { resolveTaskLocale } from '@/lib/task/resolve-locale'

export const POST = apiHandler(async (request: NextRequest) => {
  // 验证用户身份
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json()
  const { prompt } = body

  if (!prompt || typeof prompt !== 'string') {
    throw new ApiError('INVALID_PARAMS', { message: '请输入提示词' })
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

  // 构建提示词（使用项目的 prompt-i18n 系统）
  const systemPrompt = buildPrompt({
    promptId: PROMPT_IDS.COMFYUI_OPTIMIZE_PROMPT,
    locale,
    variables: {
      user_input: prompt.trim(),
    },
  })

  // 调用 LLM（使用项目的 ai-runtime）
  const completion = await executeAiTextStep({
    userId: session.user.id,
    model: `${modelSelection.provider}::${modelSelection.modelId}`,
    messages: [{ role: 'user', content: systemPrompt }],
    temperature: 0.3,
    maxTokens: 200, // 限制输出长度，加快速度
    projectId: 'comfyui',
    action: 'comfyui_optimize_prompt',
    meta: {
      stepId: 'optimize_prompt',
      stepTitle: '提示词优化',
      stepIndex: 1,
      stepTotal: 1,
    },
  })

  const aiResponse = completion.text

  if (!aiResponse) {
    throw new ApiError('INTERNAL_ERROR', { message: 'AI 返回内容为空' })
  }

  // 新提示词直接返回文本，不解析 JSON
  const optimizedPrompt = aiResponse.trim()

  return NextResponse.json({
    success: true,
    originalPrompt: prompt,
    optimizedPrompt,
  })
})
