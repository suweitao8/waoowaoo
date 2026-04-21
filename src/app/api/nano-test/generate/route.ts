import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth } from '@/lib/api-auth'
import { generateImage } from '@/lib/generator-api'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUserAuth()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }
    const { session } = authResult
    const userId = session.user.id

    const body = await request.json()
    const { model, prompt, imageSize, aspectRatio } = body

    console.log('[nano-test] Received request:', { model, prompt: prompt?.substring(0, 50), imageSize, aspectRatio })

    if (!model || !prompt) {
      return NextResponse.json({ error: 'Missing model or prompt' }, { status: 400 })
    }

    // Grsai 使用 imageSize 和 aspectRatio 参数
    const options: {
      imageSize?: string
      aspectRatio?: string
    } = {}

    if (imageSize) {
      options.imageSize = imageSize
    }
    if (aspectRatio) {
      options.aspectRatio = aspectRatio
    }

    console.log('[nano-test] Calling generateImage with:', {
      model,
      prompt: prompt.substring(0, 50),
      options,
    })

    // 调用系统图片生成 API
    const result = await generateImage(userId, model, prompt, options)

    console.log('[nano-test] Result:', {
      success: result.success,
      hasImage: !!result.imageUrl || !!result.imageBase64,
      error: result.error,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Generation failed' }, { status: 500 })
    }

    if (result.imageUrl) {
      return NextResponse.json({ imageUrl: result.imageUrl })
    }

    if (result.imageBase64) {
      return NextResponse.json({ imageUrl: `data:image/png;base64,${result.imageBase64}` })
    }

    return NextResponse.json({ error: 'No image returned' }, { status: 500 })

  } catch (error) {
    console.error('[nano-test] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
