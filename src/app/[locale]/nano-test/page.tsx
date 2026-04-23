'use client'

import { useState, useRef } from 'react'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'

// 16:9 尺寸选项
const PRESET_SIZES = [
  { label: '720p', imageSize: '720p', aspectRatio: '16:9' },
  { label: '1K', imageSize: '1K', aspectRatio: '16:9' },
  { label: '2K', imageSize: '2K', aspectRatio: '16:9' },
  { label: '4K', imageSize: '4K', aspectRatio: '16:9' },
]

// Grsai Nano Banana 模型列表
const NANO_MODELS = [
  { value: 'nano-banana-fast', label: 'Nano Banana Fast (快速)' },
  { value: 'nano-banana', label: 'Nano Banana (标准)' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro (专业)' },
  { value: 'nano-banana-2', label: 'Nano Banana 2 (新版)' },
]

interface ProgressInfo {
  current: number
  total: number
  status: string
}

interface GenerationResult {
  imageUrl: string
  error?: string
  duration?: number
}

export default function NanoTestPage() {
  // 状态
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  // 使用 ref 保存开始时间
  const startTimeRef = useRef<number | null>(null)

  // 表单状态
  const [prompt, setPrompt] = useState('超写实，一只拟人化的公鸡穿着专业篮球服，肌肉线条明显，在室内篮球场上跃起投篮，动作舒展有力，汗水质感真实，球场灯光硬朗清晰，细节丰富，皮肤与羽毛纹理逼真，动态抓拍，电影级光影，8K 超高清，锐利对焦，真实摄影质感，临场感强')
    const [size, setSize] = useState('2K')
  const [model, setModel] = useState('nano-banana-fast')
  const [apiKey, setApiKey] = useState('sk-e22dbf415b104fccaa91a05bf9e8e633')

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // 解析尺寸配置
  const getSizeConfig = (sizeStr: string) => {
    const preset = PRESET_SIZES.find(s => s.label === sizeStr)
    if (preset) {
      return preset
    }
    // 默认返回 4K
    return { label: '4K', imageSize: '4K', aspectRatio: '16:9' }
  }

  // 直接测试 Grsai API
  const handleDirectTest = async () => {
    if (!prompt.trim() || generating) return
    if (!apiKey.trim()) {
      addLog('错误: 请输入 API Key')
      return
    }

    setGenerating(true)
    setResult(null)
    setProgress({ current: 0, total: 100, status: '正在连接 Grsai API...' })
    startTimeRef.current = Date.now()
    addLog(`开始生成: 模型=${model}, 提示词="${prompt.substring(0, 50)}..."`)

    try {
      const sizeConfig = getSizeConfig(size)

      setProgress({ current: 20, total: 100, status: '正在发送请求...' })
      addLog(`请求参数: imageSize=${sizeConfig.imageSize}, aspectRatio=${sizeConfig.aspectRatio}`)

      // 调用 Grsai Nano Banana 绘画接口
      const requestBody = {
        model: model,
        prompt: prompt,
        aspectRatio: sizeConfig.aspectRatio,
        imageSize: sizeConfig.imageSize,
      }
      addLog(`请求体: ${JSON.stringify(requestBody)}`)

      const response = await fetch('https://grsai.dakka.com.cn/v1/draw/nano-banana', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      addLog(`HTTP 状态码: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 错误: ${response.status} - ${errorText}`)
      }

      // 使用 ReadableStream 读取 SSE 响应
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let imageUrl = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          addLog('响应流结束')
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

          try {
            const data = JSON.parse(line)

            // 更新进度
            if (data.progress !== undefined) {
              setProgress({ current: Math.max(20, data.progress), total: 100, status: `生成中... ${data.progress}%` })
              addLog(`进度: ${data.progress}%`)
            }

            // 检查状态
            if (data.status === 'failed') {
              throw new Error(`生成失败: ${data.failure_reason || data.error || '未知错误'}`)
            }

            // 提取图片 URL（成功时）
            if (data.status === 'succeeded' && data.results?.length > 0) {
              const result = data.results[0]
              if (result.url) {
                imageUrl = result.url
                addLog(`成功! 图片URL: ${result.url.substring(0, 80)}...`)
              }
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              addLog(`解析失败: ${line.substring(0, 100)}`)
              continue
            }
            throw e
          }
        }
      }

      // 处理 buffer 中剩余的内容
      if (buffer.trim().startsWith('{')) {
        try {
          const data = JSON.parse(buffer.trim())
          if (data.status === 'succeeded' && data.results?.length > 0) {
            imageUrl = data.results[0].url
          }
        } catch {
          // 忽略解析错误
        }
      }

      if (!imageUrl) {
        throw new Error('生成超时或未返回图片')
      }

      const duration = (Date.now() - (startTimeRef.current || 0)) / 1000

      setResult({
        imageUrl,
        duration,
      })

      setProgress({ current: 100, total: 100, status: '生成完成!' })
      addLog(`生成成功! 耗时: ${duration.toFixed(1)}秒`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addLog(`错误: ${errorMessage}`)
      setResult({
        imageUrl: '',
        error: errorMessage,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 通过系统 API 测试
  const handleSystemTest = async () => {
    if (!prompt.trim() || generating) return

    setGenerating(true)
    setResult(null)
    setProgress({ current: 0, total: 100, status: '正在调用系统 API...' })
    startTimeRef.current = Date.now()
    addLog(`开始系统测试: 模型=grsai::${model}`)

    try {
      const sizeConfig = getSizeConfig(size)

      setProgress({ current: 20, total: 100, status: '正在发送请求...' })
      addLog(`请求参数: imageSize=${sizeConfig.imageSize}, aspectRatio=${sizeConfig.aspectRatio}`)

      // 调用系统 API
      const response = await apiFetch('/api/nano-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `grsai::${model}`,
          prompt,
          imageSize: sizeConfig.imageSize,
          aspectRatio: sizeConfig.aspectRatio,
        }),
      })

      setProgress({ current: 50, total: 100, status: '正在等待 Grsai API 响应（可能需要 30-90 秒）...' })
      addLog('请求已发送，等待响应...')

      const data = await response.json()

      setProgress({ current: 80, total: 100, status: '正在处理响应...' })
      addLog(`系统响应: ${JSON.stringify(data).substring(0, 200)}...`)

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.imageUrl) {
        const duration = (Date.now() - (startTimeRef.current || 0)) / 1000
        setResult({
          imageUrl: data.imageUrl,
          duration,
        })
        setProgress({ current: 100, total: 100, status: '生成完成!' })
        addLog(`生成成功! 耗时: ${duration.toFixed(1)}秒`)
      } else {
        throw new Error(data.error || '未返回图片')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addLog(`错误: ${errorMessage}`)
      setResult({
        imageUrl: '',
        error: errorMessage,
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pin-bg-canvas)]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--pin-text-primary)] flex items-center gap-3">
            <AppIcon name="sparklesAlt" className="w-7 h-7 text-indigo-500" />
            Nano Banana API 测试
          </h1>
          <p className="text-[var(--pin-text-secondary)] mt-2">
            测试 Grsai Nano Banana 图像生成 API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：配置 */}
          <div className="space-y-6">
            {/* API Key 配置 */}
            <div className="pin-surface p-5 rounded-2xl">
              <h2 className="text-lg font-semibold text-[var(--pin-text-primary)] mb-4 flex items-center gap-2">
                <AppIcon name="settingsHex" className="w-5 h-5" />
                API 配置
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--pin-text-secondary)] mb-2">
                    Grsai API Key (直接测试用)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="输入你的 Grsai API Key"
                    className="pin-input-base w-full px-3 py-2 text-sm"
                  />
                </div>
                <div className="text-xs text-[var(--pin-text-tertiary)]">
                  提示: API Key 可以从 grsai.dakka.com.cn 获取
                </div>
              </div>
            </div>

            {/* 生成参数 */}
            <div className="pin-surface p-5 rounded-2xl">
              <h2 className="text-lg font-semibold text-[var(--pin-text-primary)] mb-4 flex items-center gap-2">
                <AppIcon name="settingsHex" className="w-5 h-5" />
                生成参数
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--pin-text-secondary)] mb-2">
                    模型
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="pin-input-base w-full px-3 py-2 text-sm"
                  >
                    {NANO_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--pin-text-secondary)] mb-2">
                    尺寸 (16:9)
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="pin-input-base w-full px-3 py-2 text-sm"
                  >
                    {PRESET_SIZES.map(s => (
                      <option key={s.label} value={s.label}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--pin-text-secondary)] mb-2">
                    提示词
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="输入提示词..."
                    rows={3}
                    className="pin-input-base w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleDirectTest}
                disabled={generating || !prompt.trim() || !apiKey.trim()}
                className="pin-btn-base pin-btn-primary flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? '生成中...' : '直接测试 API'}
              </button>
              <button
                onClick={handleSystemTest}
                disabled={generating || !prompt.trim()}
                className="pin-btn-base pin-btn-secondary flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? '生成中...' : '系统 API 测试'}
              </button>
            </div>
          </div>

          {/* 右侧：结果 */}
          <div className="space-y-6">
            {/* 进度 */}
            {progress && (
              <div className="pin-surface p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--pin-text-secondary)]">{progress.status}</span>
                  <span className="text-sm text-[var(--pin-text-primary)]">{progress.current}%</span>
                </div>
                <div className="h-2 bg-[var(--pin-bg-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${progress.current}%` }}
                  />
                </div>
              </div>
            )}

            {/* 图片结果 */}
            {result && (
              <div className="pin-surface p-5 rounded-2xl">
                <h2 className="text-lg font-semibold text-[var(--pin-text-primary)] mb-4">
                  生成结果
                </h2>
                {result.error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                    {result.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <img
                      src={result.imageUrl}
                      alt="Generated"
                      className="w-full rounded-xl"
                    />
                    {result.duration && (
                      <div className="text-sm text-[var(--pin-text-secondary)]">
                        耗时: {result.duration.toFixed(1)}秒
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 日志 */}
            <div className="pin-surface p-5 rounded-2xl">
              <h2 className="text-lg font-semibold text-[var(--pin-text-primary)] mb-4 flex items-center justify-between">
                <span>日志</span>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]"
                >
                  清除
                </button>
              </h2>
              <div className="bg-[var(--pin-bg-muted)] rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-[var(--pin-text-secondary)]">
                {logs.length === 0 ? (
                  <div className="text-[var(--pin-text-tertiary)]">暂无日志</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
