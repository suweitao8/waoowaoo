import type { VoxCPMProbeResult, VoxCPMProbeStep } from './types'

const DEFAULT_VOXCPM_ENDPOINT = 'http://localhost:7860'

function getVoxCPMEndpoint(): string {
  return process.env.VOXCPM_ENDPOINT || DEFAULT_VOXCPM_ENDPOINT
}

function classifyStatus(status: number): string {
  if (status === 401 || status === 403) return `Authentication failed (${status})`
  if (status === 404) return `Endpoint not found (${status})`
  if (status === 429) return `Rate limited (${status})`
  if (status >= 500) return `Server error (${status})`
  return `Provider error (${status})`
}

export async function probeVoxCPM(): Promise<VoxCPMProbeResult> {
  const steps: VoxCPMProbeStep[] = []
  const endpoint = getVoxCPMEndpoint()

  try {
    // 检查健康状态
    const healthResponse = await fetch(`${endpoint}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })

    if (!healthResponse.ok) {
      const detail = await healthResponse.text().catch(() => '')
      steps.push({
        name: 'health',
        status: 'fail',
        message: classifyStatus(healthResponse.status),
        detail: detail.slice(0, 500),
      })
      steps.push({
        name: 'models',
        status: 'skip',
        message: 'Skipped due to health check failure',
      })
      return { success: false, steps }
    }

    steps.push({
      name: 'health',
      status: 'pass',
      message: `VoxCPM server is running at ${endpoint}`,
    })

    // 尝试获取模型列表（如果支持）
    try {
      const modelsResponse = await fetch(`${endpoint}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      })

      if (modelsResponse.ok) {
        const data = await modelsResponse.json() as { data?: Array<{ id?: string }> }
        const models = Array.isArray(data.data) ? data.data.map(m => m.id).filter(Boolean) : []
        steps.push({
          name: 'models',
          status: 'pass',
          message: models.length > 0 ? `Available models: ${models.join(', ')}` : 'No models listed',
        })
      } else {
        steps.push({
          name: 'models',
          status: 'skip',
          message: 'Model listing not available',
        })
      }
    } catch {
      steps.push({
        name: 'models',
        status: 'skip',
        message: 'Model listing not supported',
      })
    }

    return { success: true, steps }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    steps.push({
      name: 'health',
      status: 'fail',
      message: `Connection failed: ${message}`,
      detail: `Endpoint: ${endpoint}`,
    })
    steps.push({
      name: 'models',
      status: 'skip',
      message: 'Skipped due to connection failure',
    })
    return { success: false, steps }
  }
}
