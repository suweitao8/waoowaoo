import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { getUserModelConfig } from '@/lib/config-service'
import { addCharacterPromptSuffix, getArtStylePrompt } from '@/lib/constants'
import { chatCompletion, getCompletionContent } from '@/lib/llm-client'

const getSystemPrompt = (artStylePrompt: string) => `你是一个专业的AI图像提示词专家，专门为文生图模型（如DALL-E、Midjourney、Stable Diffusion等）生成高质量的提示词。

你的任务是根据用户提供的角色名称和角色描述，生成一段详细的、适合文生图的提示词。

## 输出要求
1. 直接输出提示词，不要有任何解释或前缀
2. 提示词应该详细描述角色的视觉元素，包括：
   - 外貌特征：角色应具有典型的中国人/东亚人面部特征（黑发、深棕色瞳孔、东亚面孔轮廓）
   - 服装和配饰：根据角色描述选择合适的服装风格
   - 姿态和表情
   - 整体风格和氛围
3. 提示词应该融合角色名称和描述中的关键信息
4. 使用清晰、具体的描述语言
5. 适合 ${artStylePrompt || '写实风格'} 的风格

## 注意事项
- 默认角色为中国人/东亚人面孔，除非角色描述中明确指定其他种族
- 不要包含背景描述（除非角色描述中明确提到）
- 不要包含过于抽象或情感化的描述
- 使用具体的视觉元素描述
- 保持提示词简洁但详细`

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => ({}))
  const characterId = typeof body?.characterId === 'string' ? body.characterId.trim() : ''
  const characterName = typeof body?.characterName === 'string' ? body.characterName.trim() : ''
  const characterDescription = typeof body?.characterDescription === 'string' ? body.characterDescription.trim() : ''
  const appearanceIndexValue = Number(body?.appearanceIndex ?? 0)
  const appearanceIndex = Number.isFinite(appearanceIndexValue) ? Math.max(0, Math.floor(appearanceIndexValue)) : 0
  const artStyle = typeof body?.artStyle === 'string' ? body.artStyle : 'realistic'

  if (!characterId) {
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
  const userPrompt = `请根据以下角色信息生成一段适合文生图的提示词：

角色名称：${characterName || '未命名角色'}
角色描述：${characterDescription || '无描述'}

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

  // 添加角色风格后缀
  const finalPrompt = addCharacterPromptSuffix(generatedPrompt)

  // 保存到数据库
  await prisma.globalCharacterAppearance.update({
    where: {
      characterId_appearanceIndex: {
        characterId,
        appearanceIndex,
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
