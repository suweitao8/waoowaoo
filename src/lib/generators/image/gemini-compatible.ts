import { getProviderConfig } from '@/lib/api-config'
import { getInternalBaseUrl } from '@/lib/env'
import { getImageBase64Cached } from '@/lib/image-cache'
import { BaseImageGenerator, type GenerateResult, type ImageGenerateParams } from '../base'

type GeminiCompatibleContentPart = { inlineData: { mimeType: string; data: string } } | { text: string }

type GeminiCompatibleOptions = {
  aspectRatio?: string
  resolution?: string
  imageSize?: string  // Grsai 专用：'720p' | '1K' | '2K' | '4K'
  provider?: string
  modelId?: string
  modelKey?: string
}

function toAbsoluteUrlIfNeeded(value: string): string {
  if (!value.startsWith('/')) return value
  const baseUrl = getInternalBaseUrl()
  return `${baseUrl}${value}`
}

function parseDataUrl(value: string): { mimeType: string; base64: string } | null {
  const marker = ';base64,'
  const markerIndex = value.indexOf(marker)
  if (!value.startsWith('data:') || markerIndex === -1) return null
  const mimeType = value.slice(5, markerIndex)
  const base64 = value.slice(markerIndex + marker.length)
  if (!mimeType || !base64) return null
  return { mimeType, base64 }
}

async function toInlineData(imageSource: string): Promise<{ mimeType: string; data: string } | null> {
  const parsedDataUrl = parseDataUrl(imageSource)
  if (parsedDataUrl) {
    return { mimeType: parsedDataUrl.mimeType, data: parsedDataUrl.base64 }
  }

  if (imageSource.startsWith('http://') || imageSource.startsWith('https://') || imageSource.startsWith('/')) {
    const cachedDataUrl = await getImageBase64Cached(toAbsoluteUrlIfNeeded(imageSource))
    const parsedCachedDataUrl = parseDataUrl(cachedDataUrl)
    if (!parsedCachedDataUrl) return null
    return { mimeType: parsedCachedDataUrl.mimeType, data: parsedCachedDataUrl.base64 }
  }

  return { mimeType: 'image/png', data: imageSource }
}

function assertAllowedOptions(options: Record<string, unknown>) {
  const allowedKeys = new Set([
    'provider',
    'modelId',
    'modelKey',
    'aspectRatio',
    'resolution',
    'imageSize',
  ])
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue
    if (!allowedKeys.has(key)) {
      throw new Error(`GEMINI_COMPATIBLE_IMAGE_OPTION_UNSUPPORTED: ${key}`)
    }
  }
}

/**
 * 将 aspectRatio 转换为像素尺寸
 * Grsai API 需要具体的像素尺寸，不支持 aspectRatio 字符串
 */
function aspectRatioToSize(aspectRatio: string): string | null {
  const mapping: Record<string, string> = {
    '16:9': '1920x1080',
    '9:16': '1080x1920',
    '1:1': '1024x1024',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '4:3': '1280x960',
    '3:4': '960x1280',
    '5:4': '1280x1024',
    '4:5': '1024x1280',
    '21:9': '2560x1080',
  }
  return mapping[aspectRatio] || null
}

/**
 * 直接使用 fetch 调用 Gemini 兼容 API（避免 SDK 开销）
 */
async function generateWithDirectFetch(params: {
  baseUrl: string
  apiKey: string
  modelId: string
  prompt: string
  referenceImages: string[]
  aspectRatio?: string
  resolution?: string
  imageSize?: string  // Grsai 专用
}): Promise<GenerateResult> {
  const { baseUrl, apiKey, modelId, prompt, referenceImages, aspectRatio, resolution, imageSize } = params

  const parts: GeminiCompatibleContentPart[] = []

  for (const referenceImage of referenceImages.slice(0, 14)) {
    const inlineData = await toInlineData(referenceImage)
    if (!inlineData) {
      throw new Error('GEMINI_COMPATIBLE_REFERENCE_INVALID: failed to parse reference image')
    }
    parts.push({ inlineData })
  }
  parts.push({ text: prompt })

  // 构建生成配置
  const generationConfig: Record<string, unknown> = {
    responseModalities: ['TEXT', 'IMAGE'],
  }

  // Grsai 专用参数：imageSize 和 aspectRatio
  if (imageSize) {
    generationConfig.imageSize = imageSize
  }
  if (aspectRatio) {
    generationConfig.aspectRatio = aspectRatio
  }

  // 优先使用 resolution（像素尺寸），否则将 aspectRatio 转换为 size（仅非 Grsai 场景）
  if (resolution) {
    generationConfig.size = resolution
  } else if (aspectRatio && !imageSize) {
    // 只有非 Grsai 场景才转换 aspectRatio 为 size
    const size = aspectRatioToSize(aspectRatio)
    if (size) {
      generationConfig.size = size
    }
  }

  const requestBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig,
  }

  console.log('[gemini-compatible] Request:', JSON.stringify({
    modelId,
    aspectRatio,
    resolution,
    imageSize,
    generationConfig,
  }))

  const url = `${baseUrl}/v1beta/models/${modelId}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GEMINI_COMPATIBLE_API_ERROR: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // 检查 Grsai 特有的错误格式
  if (data.code && data.code !== 0) {
    throw new Error(`GEMINI_COMPATIBLE_PROVIDER_ERROR: ${data.msg || data.code}`)
  }

  const candidate = data.candidates?.[0]
  const responseParts = candidate?.content?.parts || []

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png'
      const imageBase64 = part.inlineData.data
      return {
        success: true,
        imageBase64,
        imageUrl: `data:${mimeType};base64,${imageBase64}`,
      }
    }
  }

  const finishReason = candidate?.finishReason
  if (finishReason === 'IMAGE_SAFETY' || finishReason === 'SAFETY') {
    throw new Error('内容因安全策略被过滤')
  }

  throw new Error('GEMINI_COMPATIBLE_IMAGE_EMPTY_RESPONSE: no image data returned')
}

export class GeminiCompatibleImageGenerator extends BaseImageGenerator {
  private readonly modelId?: string
  private readonly providerId?: string

  constructor(modelId?: string, providerId?: string) {
    super()
    this.modelId = modelId
    this.providerId = providerId
  }

  protected async doGenerate(params: ImageGenerateParams): Promise<GenerateResult> {
    const { userId, prompt, referenceImages = [], options = {} } = params

    // 调试日志：打印原始 options
    console.log('[gemini-compatible] doGenerate called with options:', JSON.stringify(options))

    assertAllowedOptions(options)

    const providerId = this.providerId || 'gemini-compatible'
    const providerConfig = await getProviderConfig(userId, providerId)
    if (!providerConfig.baseUrl) {
      throw new Error(`PROVIDER_BASE_URL_MISSING: ${providerId}`)
    }

    const normalizedOptions = options as GeminiCompatibleOptions
    const modelId = this.modelId || normalizedOptions.modelId || 'gemini-2.5-flash-image-preview'

    console.log('[gemini-compatible] normalizedOptions:', JSON.stringify({
      aspectRatio: normalizedOptions.aspectRatio,
      resolution: normalizedOptions.resolution,
      imageSize: normalizedOptions.imageSize,
      modelId,
    }))

    // 使用直接 fetch 调用，避免 SDK 开销
    return await generateWithDirectFetch({
      baseUrl: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      modelId,
      prompt,
      referenceImages,
      aspectRatio: normalizedOptions.aspectRatio,
      resolution: normalizedOptions.resolution,
      imageSize: normalizedOptions.imageSize,
    })
  }
}
