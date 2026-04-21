/**
 * ComfyUI 图片生成 API
 * 支持 SSE 流式返回进度
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImage, getAvailableModels, checkComfyUIStatus, ComfyUIGenerateOptions, ProgressCallback } from '@/lib/comfyui/client'

// 默认工作流文件
const DEFAULT_WORKFLOW_FILE = '【WF-26.03.20】Z-Image-瑶光版-超真实细节增强.json'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stream, ...rest } = body

    const options: ComfyUIGenerateOptions = {
      prompt: rest.prompt || '',
      negativePrompt: rest.negativePrompt,
      width: rest.width,
      height: rest.height,
      steps: rest.steps,
      cfgScale: rest.cfgScale,
      seed: rest.seed,
      samplerName: rest.samplerName,
      scheduler: rest.scheduler,
      workflowFile: rest.workflowFile || DEFAULT_WORKFLOW_FILE,
    }

    if (!options.prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // 如果请求流式响应，使用 SSE
    if (stream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const progressCallback: ProgressCallback = (progress) => {
            const data = JSON.stringify({
              type: 'progress',
              current: progress.current,
              total: progress.total,
              status: progress.status,
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          try {
            const result = await generateImage(options, progressCallback)

            // 发送最终结果
            const finalData = JSON.stringify({
              type: 'result',
              ...result,
            })
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 非流式响应
    const result = await generateImage(options)

    if (result.success) {
      return NextResponse.json({
        success: true,
        imageData: result.imageData,
        imageUrl: result.imageUrl,
        promptId: result.promptId,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('ComfyUI generate error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'models') {
    const models = await getAvailableModels()
    return NextResponse.json({ success: true, models })
  }

  if (action === 'status') {
    const status = await checkComfyUIStatus()
    return NextResponse.json({ success: true, ...status })
  }

  return NextResponse.json(
    { success: false, error: 'Invalid action. Use ?action=models or ?action=status' },
    { status: 400 }
  )
}
