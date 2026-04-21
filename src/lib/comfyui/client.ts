/**
 * ComfyUI API 客户端
 *
 * 封装 ComfyUI API 调用，支持文生图功能
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const COMFYUI_HOST = process.env.COMFYUI_HOST || 'http://127.0.0.1:8188'

// 工作流文件路径（相对于项目根目录）
const WORKFLOW_DIR = process.cwd()

// ============================================================
// 类型定义
// ============================================================

export interface ComfyUIGenerateOptions {
  prompt: string
  negativePrompt?: string
  model?: string // 可选，使用工作流中的默认模型
  width?: number
  height?: number
  steps?: number
  cfgScale?: number
  seed?: number
  samplerName?: string
  scheduler?: string
  // 自定义工作流选项
  workflowFile?: string // 工作流文件名
}

export interface ComfyUIResult {
  success: boolean
  imageUrl?: string
  imageData?: string // base64
  error?: string
  promptId?: string
}

// 进度回调类型
export type ProgressCallback = (progress: { current: number; total: number; status: string }) => void

interface ComfyUINode {
  inputs: Record<string, unknown>
  class_type: string
  _meta?: Record<string, unknown>
}

interface ComfyUIWorkflow {
  [key: string]: ComfyUINode
}

interface ComfyUIQueueResponse {
  prompt_id: string
  number: number
  node_errors?: Record<string, unknown>
}

interface ComfyUIHistoryItem {
  prompt: unknown[]
  outputs: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>
  status?: {
    status_str: string
    completed: boolean
    messages?: Array<[string, unknown]>
  }
}

// ============================================================
// 工作流构建
// ============================================================

/**
 * 加载自定义工作流文件
 */
function loadWorkflowFile(filename: string): ComfyUIWorkflow | null {
  try {
    const filePath = join(WORKFLOW_DIR, filename)
    if (!existsSync(filePath)) {
      console.error(`Workflow file not found: ${filePath}`)
      return null
    }
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as ComfyUIWorkflow
  } catch (error) {
    console.error(`Failed to load workflow file: ${filename}`, error)
    return null
  }
}

/**
 * 查找工作流中的特定类型节点
 */
function findNodeByClassType(workflow: ComfyUIWorkflow, classType: string): { id: string; node: ComfyUINode } | null {
  for (const [id, node] of Object.entries(workflow)) {
    if (node.class_type === classType) {
      return { id, node }
    }
  }
  return null
}

/**
 * 使用自定义工作流并注入参数
 */
function buildWorkflowFromTemplate(options: ComfyUIGenerateOptions): ComfyUIWorkflow {
  const { workflowFile, prompt, width, height, seed } = options

  // 如果指定了工作流文件，加载并修改
  if (workflowFile) {
    const workflow = loadWorkflowFile(workflowFile)
    if (!workflow) {
      throw new Error(`Failed to load workflow file: ${workflowFile}`)
    }

    // 修改 CR Text 节点中的提示词
    const crTextNode = findNodeByClassType(workflow, 'CR Text')
    if (crTextNode) {
      workflow[crTextNode.id].inputs.text = prompt
    }

    // 修改 EmptyLatentImage 节点的尺寸
    const latentNode = findNodeByClassType(workflow, 'EmptyLatentImage')
    if (latentNode && (width || height)) {
      workflow[latentNode.id].inputs.width = width || workflow[latentNode.id].inputs.width
      workflow[latentNode.id].inputs.height = height || workflow[latentNode.id].inputs.height
    }

    // 修改 KSampler 的 seed
    const ksamplerNode = findNodeByClassType(workflow, 'KSampler')
    if (ksamplerNode && seed !== undefined) {
      workflow[ksamplerNode.id].inputs.seed = seed
    } else if (ksamplerNode) {
      // 随机种子
      workflow[ksamplerNode.id].inputs.seed = Math.floor(Math.random() * 2147483647)
    }

    return workflow
  }

  // 否则使用默认的简单工作流
  return buildTxt2ImgWorkflow(options)
}

/**
 * 构建基础 txt2img 工作流
 */
function buildTxt2ImgWorkflow(options: ComfyUIGenerateOptions): ComfyUIWorkflow {
  const {
    prompt,
    negativePrompt = '',
    model,
    width = 512,
    height = 768,
    steps = 20,
    cfgScale = 7,
    seed = Math.floor(Math.random() * 2147483647),
    samplerName = 'euler',
    scheduler = 'normal',
  } = options

  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg: cfgScale,
        sampler_name: samplerName,
        scheduler,
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      _meta: { title: 'KSampler' },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: model,
      },
      _meta: { title: 'Load Checkpoint' },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width,
        height,
        batch_size: 1,
      },
      _meta: { title: 'Empty Latent Image' },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: prompt,
        clip: ['4', 1],
      },
      _meta: { title: 'CLIP Text Encode (Positive)' },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativePrompt,
        clip: ['4', 1],
      },
      _meta: { title: 'CLIP Text Encode (Negative)' },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
      _meta: { title: 'VAE Decode' },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'ComfyUI',
        images: ['8', 0],
      },
      _meta: { title: 'Save Image' },
    },
  }
}

// ============================================================
// API 客户端
// ============================================================

/**
 * 获取客户端 ID
 */
async function getClientId(): Promise<string> {
  try {
    const response = await fetch(`${COMFYUI_HOST}/queue`)
    const data = await response.json()
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  } catch {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * 提交工作流到队列
 */
async function queuePrompt(workflow: ComfyUIWorkflow, clientId: string): Promise<ComfyUIQueueResponse> {
  const response = await fetch(`${COMFYUI_HOST}/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: workflow,
      client_id: clientId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ComfyUI queue prompt failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * 获取任务历史
 */
async function getHistory(promptId: string): Promise<Record<string, ComfyUIHistoryItem>> {
  const response = await fetch(`${COMFYUI_HOST}/history/${promptId}`)
  if (!response.ok) {
    throw new Error(`ComfyUI get history failed: ${response.status}`)
  }
  return response.json()
}

/**
 * 获取生成的图片
 */
async function getImage(filename: string, subfolder: string, type: string): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    filename,
    subfolder,
    type,
  })
  const response = await fetch(`${COMFYUI_HOST}/view?${params}`)
  if (!response.ok) {
    throw new Error(`ComfyUI get image failed: ${response.status}`)
  }
  return response.arrayBuffer()
}

/**
 * 等待任务完成并获取结果（带进度回调）
 */
async function waitForCompletion(
  promptId: string,
  maxWaitMs: number = 300000, // 5 minutes
  pollIntervalMs: number = 1000,
  progressCallback?: ProgressCallback,
): Promise<ComfyUIHistoryItem | null> {
  const startTime = Date.now()
  let lastProgress = 0

  // 模拟进度更新
  const updateProgress = (status: string, increment: number = 0) => {
    lastProgress = Math.min(lastProgress + increment, 95)
    progressCallback?.({
      current: lastProgress,
      total: 100,
      status,
    })
  }

  updateProgress('正在初始化...', 5)

  while (Date.now() - startTime < maxWaitMs) {
    const history = await getHistory(promptId)
    const item = history[promptId]

    if (item) {
      // 解析进度信息
      if (item.status?.messages) {
        for (const [type, data] of item.status.messages) {
          if (type === 'execution_cached') {
            updateProgress('使用缓存数据...', 20)
          } else if (type === 'execution_start') {
            updateProgress('开始生成...', 10)
          } else if (type === 'executing') {
            updateProgress('正在生成图片...', 15)
          } else if (type === 'progress') {
            const progressData = data as { value?: number; max?: number }
            if (progressData.value && progressData.max) {
              const percent = Math.floor((progressData.value / progressData.max) * 60)
              updateProgress(`正在渲染... ${progressData.value}/${progressData.max}`, percent - lastProgress + 30)
            }
          }
        }
      }

      // 检查是否完成
      if (item.status?.completed || item.outputs) {
        updateProgress('生成完成！', 100 - lastProgress)
        return item
      }

      // 检查是否有错误
      if (item.status?.status_str === 'error') {
        throw new Error('ComfyUI execution failed')
      }
    }

    // 等待一段时间后再次轮询
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('ComfyUI execution timeout')
}

/**
 * 将 ArrayBuffer 转换为 base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

// ============================================================
// 主要接口
// ============================================================

/**
 * 生成图片
 */
export async function generateImage(
  options: ComfyUIGenerateOptions,
  progressCallback?: ProgressCallback,
): Promise<ComfyUIResult> {
  try {
    progressCallback?.({ current: 0, total: 100, status: '正在准备...' })

    // 构建工作流（支持自定义工作流文件）
    const workflow = buildWorkflowFromTemplate(options)

    progressCallback?.({ current: 5, total: 100, status: '正在连接 ComfyUI...' })

    // 获取客户端 ID
    const clientId = await getClientId()

    progressCallback?.({ current: 10, total: 100, status: '正在提交任务...' })

    // 提交任务
    const queueResult = await queuePrompt(workflow, clientId)
    const promptId = queueResult.prompt_id

    // 等待完成（带进度回调）
    const historyItem = await waitForCompletion(promptId, 300000, 1000, progressCallback)

    if (!historyItem) {
      return {
        success: false,
        error: 'No history item found',
        promptId,
      }
    }

    progressCallback?.({ current: 95, total: 100, status: '正在获取图片...' })

    // 获取输出图片 - 查找 SaveImage 节点
    const outputs = historyItem.outputs
    const saveImageNode = findNodeByClassType(workflow, 'SaveImage')
    const saveImageNodeId = saveImageNode?.id || '9'

    if (!outputs[saveImageNodeId]?.images?.[0]) {
      // 尝试查找任何包含 images 的输出
      for (const nodeId of Object.keys(outputs)) {
        if (outputs[nodeId]?.images?.[0]) {
          const imageInfo = outputs[nodeId].images[0]
          const imageData = await getImage(imageInfo.filename, imageInfo.subfolder, imageInfo.type)
          const base64 = arrayBufferToBase64(imageData)
          progressCallback?.({ current: 100, total: 100, status: '完成！' })
          return {
            success: true,
            imageData: base64,
            imageUrl: `data:image/png;base64,${base64}`,
            promptId,
          }
        }
      }

      return {
        success: false,
        error: 'No output image found',
        promptId,
      }
    }

    const imageInfo = outputs[saveImageNodeId]?.images?.[0]
    if (!imageInfo) {
      return {
        success: false,
        error: 'No output image found',
        promptId,
      }
    }
    const imageData = await getImage(imageInfo.filename, imageInfo.subfolder, imageInfo.type)
    const base64 = arrayBufferToBase64(imageData)

    progressCallback?.({ current: 100, total: 100, status: '完成！' })

    return {
      success: true,
      imageData: base64,
      imageUrl: `data:image/png;base64,${base64}`,
      promptId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 获取可用模型列表
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${COMFYUI_HOST}/object_info/CheckpointLoaderSimple`)
    if (!response.ok) {
      throw new Error(`Failed to get models: ${response.status}`)
    }

    const data = await response.json()
    const models = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []
    return models
  } catch (error) {
    console.error('Failed to get ComfyUI models:', error)
    return []
  }
}

/**
 * 检查 ComfyUI 是否在线
 */
export async function checkComfyUIStatus(): Promise<{ online: boolean; error?: string }> {
  try {
    const response = await fetch(`${COMFYUI_HOST}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      return { online: true }
    }
    return { online: false, error: `HTTP ${response.status}` }
  } catch (error) {
    return {
      online: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
