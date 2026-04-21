import { getProviderConfig } from '@/lib/api-config'
import { BaseImageGenerator, type GenerateResult, type ImageGenerateParams } from '../base'
import { createScopedLogger } from '@/lib/logging/core'

const logger = createScopedLogger({ module: 'generator.grsai-nano' })

type GrsaiNanoOptions = {
  aspectRatio?: string  // 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9'
  imageSize?: string    // '720p' | '1K' | '2K' | '4K' (Grsai API 专用)
  resolution?: string   // capability 系统使用，映射为 imageSize
  provider?: string
  modelId?: string
  modelKey?: string
}

/**
 * Grsai Nano Banana 图像生成器
 * 使用 /v1/draw/nano-banana 接口（SSE 流式响应）
 *
 * 参考实现: src/app/[locale]/nano-test/page.tsx handleDirectTest 函数
 */
export class GrsaiNanoImageGenerator extends BaseImageGenerator {
  private readonly modelId?: string
  private readonly providerId?: string

  constructor(modelId?: string, providerId?: string) {
    super()
    this.modelId = modelId
    this.providerId = providerId
  }

  protected async doGenerate(params: ImageGenerateParams): Promise<GenerateResult> {
    const { userId, prompt, referenceImages = [], options = {} } = params

    console.log('[grsai-nano] ========== DO GENERATE ==========')
    console.log('[grsai-nano] params:', JSON.stringify({
      userId,
      promptLength: prompt?.length,
      referenceImageCount: referenceImages.length,
      options: options,
    }, null, 2))

    const providerId = this.providerId || 'grsai'
    const providerConfig = await getProviderConfig(userId, providerId)

    if (!providerConfig.apiKey) {
      throw new Error(`GRSAI_API_KEY_MISSING: ${providerId}`)
    }

    const normalizedOptions = options as GrsaiNanoOptions
    const modelId = this.modelId || normalizedOptions.modelId || 'nano-banana-fast'

    // 默认参数
    // 优先使用 imageSize，其次使用 resolution（capability 系统），默认 '2K'
    const aspectRatio = normalizedOptions.aspectRatio || '16:9'
    const imageSize = normalizedOptions.imageSize || normalizedOptions.resolution || '2K'

    console.log('[grsai-nano] Final parameters:', {
      modelId,
      aspectRatio,
      imageSize,
      normalizedOptions: {
        aspectRatio: normalizedOptions.aspectRatio,
        imageSize: normalizedOptions.imageSize,
        resolution: normalizedOptions.resolution,
      },
    })

    // 构建 Grsai API 请求
    const requestBody: Record<string, unknown> = {
      model: modelId,
      prompt: prompt,
      aspectRatio: aspectRatio,
      imageSize: imageSize,
    }

    // 如果有参考图片，添加 urls 参数
    if (referenceImages.length > 0) {
      requestBody.urls = referenceImages.slice(0, 4)
    }

    console.log('[grsai-nano] Request body:', JSON.stringify(requestBody, null, 2))

    const url = 'https://grsai.dakka.com.cn/v1/draw/nano-banana'

    logger.info({
      message: 'Grsai API request started',
      details: {
        model: modelId,
        aspectRatio,
        imageSize,
        hasReferenceImages: referenceImages.length > 0,
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GRSAI_API_ERROR: ${response.status} - ${errorText}`)
    }

    // 使用 ReadableStream 读取 SSE 响应（参考 nano-test/page.tsx）
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('GRSAI_STREAM_ERROR: 无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let imageUrl: string | null = null
    const startTime = Date.now()

    console.log(`[grsai-nano] Starting SSE stream reading...`)

    // 直接读取流，不设置超时（参考测试页面的实现）
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log(`[grsai-nano] SSE stream ended, duration: ${Date.now() - startTime}ms`)
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // SSE 格式：每个事件以 "data: " 开头，可能用空格或换行分隔
      // 先尝试按 "data: " 分割
      const parts = buffer.split('data: ')

      // 保留最后一个可能不完整的部分
      buffer = parts.pop() || ''

      for (const part of parts) {
        const line = part.trim()
        if (!line) continue

        console.log(`[grsai-nano] SSE line: ${line.substring(0, 150)}...`)

        try {
          const data = JSON.parse(line)

          console.log(`[grsai-nano] Parsed SSE data: status=${data.status}, progress=${data.progress}, hasUrl=${!!data.results?.[0]?.url}`)

          // 检查失败状态
          if (data.status === 'failed') {
            throw new Error(`GRSAI_GENERATION_FAILED: ${data.failure_reason || data.error || '未知错误'}`)
          }

          // 提取图片 URL（成功时）
          if (data.status === 'succeeded' && data.results?.length > 0) {
            const result = data.results[0]
            if (result.url) {
              imageUrl = result.url
              console.log(`[grsai-nano] Found image URL! Length: ${result.url.length}`)
            }
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            // JSON 解析错误，继续处理下一个事件
            console.log(`[grsai-nano] JSON parse error for line: ${line.substring(0, 100)}`)
            continue
          }
          throw e
        }
      }
    }

    // 处理 buffer 中剩余的内容
    if (!imageUrl && buffer.trim()) {
      console.log(`[grsai-nano] Remaining buffer: ${buffer.substring(0, 200)}...`)
      if (buffer.trim().startsWith('{')) {
        try {
          const data = JSON.parse(buffer.trim())
          if (data.status === 'succeeded' && data.results?.length > 0) {
            imageUrl = data.results[0].url
            console.log(`[grsai-nano] Found image URL from buffer!`)
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    if (!imageUrl) {
      console.error(`[grsai-nano] ERROR: No image URL found! Buffer length: ${buffer.length}`)
      throw new Error('GRSAI_NO_IMAGE: 生成超时或未返回图片')
    }

    console.log(`[grsai-nano] SUCCESS! Image URL prefix: ${imageUrl.substring(0, 100)}`)

    return {
      success: true,
      imageUrl,
    }
  }
}
