import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { getUserModelConfig } from '@/lib/config-service'
import { addLocationPromptSuffix, getArtStylePrompt } from '@/lib/constants'
import { chatCompletion, getCompletionContent } from '@/lib/llm-client'

const getSystemPrompt = (artStylePrompt: string) => `你是一个专业的AI图像提示词专家，专门为文生图模型（如DALL-E、Midjourney、Stable Diffusion等）生成高质量的提示词。

你的任务是根据用户提供的场景名称和场景描述，生成一段详细的、适合文生图的提示词。

## 输出要求
1. 直接输出提示词，不要有任何解释或前缀
2. 提示词应该详细描述场景的视觉元素，包括：
   - 环境和背景：体现中国风格的建筑、装饰、物品等元素
   - 光线和氛围
   - 色调和质感
   - 构图和视角
3. 提示词应该融合场景名称和描述中的关键信息
4. 使用清晰、具体的描述语言
5. 适合 ${artStylePrompt || '写实风格'} 的风格

## 注意事项
- 场景应体现中国风格，包括建筑风格、装饰元素、物品摆设等
- 不要包含人物描述（除非场景描述中明确提到）
- 不要包含过于抽象或情感化的描述
- 使用具体的视觉元素描述
- 保持提示词简洁但详细`

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => ({}))
  const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''
  const locationName = typeof body?.locationName === 'string' ? body.locationName.trim() : ''
  const locationDescription = typeof body?.locationDescription === 'string' ? body.locationDescription.trim() : ''
  const imageIndexValue = Number(body?.imageIndex ?? 0)
  const imageIndex = Number.isFinite(imageIndexValue) ? Math.max(0, Math.floor(imageIndexValue)) : 0
  const artStyle = typeof body?.artStyle === 'string' ? body.artStyle : 'realistic'

  if (!locationId) {
    throw new ApiError('INVALID_PARAMS')
  }

  // 获取模型配置
  const modelConfig = await getUserModelConfig(session.user.id)
  const analysisModel = modelConfig.analysisModel

  if (!analysisModel) {
    throw new ApiError('INVALID_PARAMS', { message: 'Analysis model not configured' })
  }

  const artStylePrompt = getArtStylePrompt(artStyle, 'zh')

  // 构建用户提示
  const userPrompt = `请根据以下场景信息生成一段适合文生图的提示词：

场景名称：${locationName || '未命名场景'}
场景描述：${locationDescription || '无描述'}

请生成详细的视觉描述提示词：`

  // 调用 AI 生成提示词
  const completion = await chatCompletion(
    session.user.id,
    analysisModel,
    [
      { role: 'system', content: getSystemPrompt(artStylePrompt) },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 500 }
  )

  const generatedPrompt = getCompletionContent(completion)?.trim() || ''

  // 添加场景风格后缀
  const finalPrompt = addLocationPromptSuffix(generatedPrompt)

  // 保存到数据库
  await prisma.globalLocationImage.update({
    where: {
      locationId_imageIndex: {
        locationId,
        imageIndex,
      },
    },
    data: {
      imagePrompt: finalPrompt,
    },
  })

  return NextResponse.json({
    success: true,
    imagePrompt: finalPrompt,
  })
})
