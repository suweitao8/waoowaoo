'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'

// 16:9 尺寸选项
const PRESET_SIZES = [
  { label: '1280x720 (720p)', width: 1280, height: 720 },
  { label: '1920x1080 (1080p)', width: 1920, height: 1080 },
  { label: '2560x1440 (2K)', width: 2560, height: 1440 },
]

interface ProgressInfo {
  current: number
  total: number
  status: string
}

interface GenerationResult {
  imageUrl: string
  error?: string
  duration?: number // 生成耗时（秒）
}

interface CharacterProfile {
  name: string
  gender: string
  age_range: string
  role_level: string
  archetype: string
  personality_tags: string[]
  visual_keywords: string[]
}

interface CharacterGenerationResult {
  profile: CharacterProfile
  visualDescriptions: string[]
  recommendedPrompt: string
}

export default function ComfyUIPage() {
  const t = useTranslations('comfyui')
  const tc = useTranslations('common')

  // 状态
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [generating, setGenerating] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [generatingCharacter, setGeneratingCharacter] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [characterResult, setCharacterResult] = useState<CharacterGenerationResult | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'prompt' | 'character'>('prompt')

  // 使用 ref 保存开始时间，避免闭包问题
  const startTimeRef = useRef<number | null>(null)

  // 表单状态
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1280x720 (720p)')
  const [characterName, setCharacterName] = useState('')
  const [characterDescription, setCharacterDescription] = useState('')

  // 检查 ComfyUI 状态
  const checkStatus = useCallback(async () => {
    try {
      const statusRes = await apiFetch('/api/comfyui/generate?action=status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatus(statusData.online ? 'online' : 'offline')
      } else {
        setStatus('offline')
      }
    } catch (error) {
      console.error('Failed to check ComfyUI status:', error)
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    void checkStatus()
  }, [checkStatus])

  // 解析尺寸
  const parseSize = (sizeStr: string) => {
    const match = sizeStr.match(/(\d+)x(\d+)/)
    if (match) {
      return { width: Number(match[1]), height: Number(match[2]) }
    }
    return { width: 1280, height: 720 }
  }

  // 优化提示词
  const handleOptimizePrompt = async () => {
    if (!prompt.trim() || optimizing) return

    setOptimizing(true)
    try {
      const response = await apiFetch('/api/comfyui/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await response.json()

      if (data.success && data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt)
      } else {
        // 处理 API 返回的错误格式
        // 格式: { success: false, error: { code, message, ... }, message: "..." }
        const errorMsg = data.message
          || (typeof data.error === 'string' ? data.error : data.error?.message)
          || '优化失败，请稍后重试'
        console.error('优化提示词失败:', data)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('优化提示词异常:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert(`优化失败: ${errorMsg}`)
    } finally {
      setOptimizing(false)
    }
  }

  // 生成角色
  const handleGenerateCharacter = async () => {
    if (!characterDescription.trim() || generatingCharacter) return

    setGeneratingCharacter(true)
    setCharacterResult(null)
    try {
      const response = await apiFetch('/api/comfyui/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterName.trim() || '角色',
          description: characterDescription.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCharacterResult(data)
        // 自动填充推荐的提示词
        if (data.recommendedPrompt) {
          setPrompt(data.recommendedPrompt)
        }
      } else {
        const errorMsg = data.message
          || (typeof data.error === 'string' ? data.error : data.error?.message)
          || '生成角色失败，请稍后重试'
        console.error('生成角色失败:', data)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('生成角色异常:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert(`生成角色失败: ${errorMsg}`)
    } finally {
      setGeneratingCharacter(false)
    }
  }

  // 使用选中的视觉描述
  const handleUseDescription = (description: string) => {
    setPrompt(description)
    setActiveTab('prompt')
  }

  // 生成图片（使用 SSE 获取进度）
  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    setResult(null)
    setProgress({ current: 0, total: 100, status: '正在初始化...' })
    startTimeRef.current = Date.now() // 记录开始时间

    const { width, height } = parseSize(size)

    try {
      const response = await fetch('/api/comfyui/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          width,
          height,
          stream: true, // 启用流式响应
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                setProgress({
                  current: data.current,
                  total: data.total,
                  status: data.status,
                })
              } else if (data.type === 'result') {
                const duration = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
                if (data.success && data.imageUrl) {
                  setResult({ imageUrl: data.imageUrl, duration })
                } else {
                  setResult({ imageUrl: '', error: data.error || t('error'), duration })
                }
              } else if (data.type === 'error') {
                const duration = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
                setResult({ imageUrl: '', error: data.error, duration })
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      setResult({
        imageUrl: '',
        error: error instanceof Error ? error.message : t('error'),
      })
    } finally {
      setGenerating(false)
      setProgress(null)
      startTimeRef.current = null
    }
  }

  // 下载图片
  const handleDownload = () => {
    if (!result?.imageUrl) return
    const link = document.createElement('a')
    link.href = result.imageUrl
    link.download = `comfyui_${Date.now()}.png`
    link.click()
  }

  return (
    <div className="pin-page min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--pin-text-primary)] mb-2">{t('title')}</h1>
          <p className="text-[var(--pin-text-secondary)]">{t('subtitle')}</p>
          <p className="text-sm text-[var(--pin-text-tertiary)] mt-2">
            使用工作流: Z-Image 瑶光版 超真实细节增强
          </p>
        </div>

        {/* 标签页切换 */}
        <div className="mb-6 flex gap-2 border-b border-[var(--pin-stroke-base)]">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'prompt'
                ? 'text-[var(--pin-tone-info-fg)] border-b-2 border-[var(--pin-tone-info-fg)]'
                : 'text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]'
            }`}
          >
            {t('prompt')}
          </button>
          <button
            onClick={() => setActiveTab('character')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'character'
                ? 'text-[var(--pin-tone-info-fg)] border-b-2 border-[var(--pin-tone-info-fg)]'
                : 'text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]'
            }`}
          >
            {t('characterGenerator')}
          </button>
        </div>

        {/* 状态指示器 */}
        <div className="mb-6 flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              status === 'checking'
                ? 'bg-yellow-500 animate-pulse'
                : status === 'online'
                ? 'bg-green-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-[var(--pin-text-secondary)]">
            {status === 'checking'
              ? t('statusChecking')
              : status === 'online'
              ? t('statusOnline')
              : t('statusOffline')}
          </span>
          {status === 'offline' && (
            <button
              onClick={() => void checkStatus()}
              className="text-sm text-[var(--pin-tone-info-fg)] hover:underline ml-2"
            >
              {tc('refresh')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：表单 */}
          <div className="pin-surface p-6">
            {/* 提示词标签页内容 */}
            {activeTab === 'prompt' && (
              <>
                {/* 提示词 */}
                <div className="mb-4">
                  <label className="pin-field-label block mb-2">{t('prompt')}</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="pin-textarea-base w-full px-3 py-2"
                    placeholder={t('promptPlaceholder')}
                    rows={6}
                    disabled={generating}
                  />
                </div>

                {/* 提示词优化和生成按钮 */}
                <div className="mb-4 flex gap-3">
                  <button
                    onClick={() => void handleOptimizePrompt()}
                    disabled={optimizing || !prompt.trim() || generating}
                    className="pin-btn-base pin-btn-secondary flex-1 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {optimizing ? (
                      <span className="flex items-center justify-center gap-2">
                        <AppIcon name="refresh" className="w-5 h-5 animate-spin" />
                        优化中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <AppIcon name="sparkles" className="w-5 h-5" />
                        优化提示词
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => void handleGenerate()}
                    disabled={generating || !prompt.trim() || status !== 'online'}
                    className="pin-btn-base pin-btn-primary flex-1 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <span className="flex items-center justify-center gap-2">
                        <AppIcon name="refresh" className="w-5 h-5 animate-spin" />
                        {t('generating')}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <AppIcon name="image" className="w-5 h-5" />
                        {t('generate')}
                      </span>
                    )}
                  </button>
                </div>

                {/* 进度条 */}
                {progress && (
                  <div className="mb-4 p-4 rounded-xl border border-[var(--pin-stroke-strong)] bg-[var(--pin-bg-muted)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--pin-text-primary)]">{progress.status}</span>
                      <span className="text-xs text-[var(--pin-text-tertiary)]">{Math.round(progress.current)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--pin-stroke-base)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress.current}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 尺寸选择 */}
                <div className="mb-4">
                  <label className="pin-field-label block mb-2">{t('size')}</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="pin-input-base w-full px-3 py-2"
                    disabled={generating}
                  >
                    {PRESET_SIZES.map((s) => (
                      <option key={s.label} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* 角色生成标签页内容 */}
            {activeTab === 'character' && (
              <>
                {/* 角色名称 */}
                <div className="mb-4">
                  <label className="pin-field-label block mb-2">{t('characterName')}</label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="pin-input-base w-full px-3 py-2"
                    placeholder={t('characterNamePlaceholder')}
                    disabled={generatingCharacter}
                  />
                </div>

                {/* 角色描述 */}
                <div className="mb-4">
                  <label className="pin-field-label block mb-2">{t('characterDescription')}</label>
                  <textarea
                    value={characterDescription}
                    onChange={(e) => setCharacterDescription(e.target.value)}
                    className="pin-textarea-base w-full px-3 py-2"
                    placeholder={t('characterDescriptionPlaceholder')}
                    rows={6}
                    disabled={generatingCharacter}
                  />
                </div>

                {/* 生成角色按钮 */}
                <div className="mb-4">
                  <button
                    onClick={() => void handleGenerateCharacter()}
                    disabled={generatingCharacter || !characterDescription.trim()}
                    className="pin-btn-base pin-btn-primary w-full px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingCharacter ? (
                      <span className="flex items-center justify-center gap-2">
                        <AppIcon name="refresh" className="w-5 h-5 animate-spin" />
                        {t('generatingCharacter')}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <AppIcon name="usersRound" className="w-5 h-5" />
                        {t('generateCharacter')}
                      </span>
                    )}
                  </button>
                </div>

                {/* 角色生成结果 */}
                {characterResult && (
                  <div className="space-y-4">
                    {/* 角色档案信息 */}
                    <div className="p-4 rounded-xl border border-[var(--pin-stroke-strong)] bg-[var(--pin-bg-muted)]">
                      <h4 className="text-sm font-medium text-[var(--pin-text-primary)] mb-2">
                        {characterResult.profile.name}
                      </h4>
                      <div className="text-sm text-[var(--pin-text-secondary)] space-y-1">
                        <p><span className="text-[var(--pin-text-tertiary)]">类型:</span> {characterResult.profile.archetype}</p>
                        <p><span className="text-[var(--pin-text-tertiary)]">性格:</span> {characterResult.profile.personality_tags?.join(', ')}</p>
                        <p><span className="text-[var(--pin-text-tertiary)]">关键词:</span> {characterResult.profile.visual_keywords?.join(', ')}</p>
                      </div>
                    </div>

                    {/* 视觉描述选择 */}
                    <div>
                      <label className="pin-field-label block mb-2">{t('selectVisualDescription')}</label>
                      <div className="space-y-2">
                        {characterResult.visualDescriptions.map((desc, index) => (
                          <button
                            key={index}
                            onClick={() => handleUseDescription(desc)}
                            className="w-full text-left p-3 rounded-lg border border-[var(--pin-stroke-base)] hover:border-[var(--pin-tone-info-fg)] hover:bg-[var(--pin-bg-fog)] transition-colors text-sm text-[var(--pin-text-secondary)]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="line-clamp-2">{desc}</span>
                              <AppIcon name="arrowRight" className="w-4 h-4 flex-shrink-0 text-[var(--pin-text-tertiary)]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 右侧：结果预览 */}
          <div className="pin-surface p-6">
            <h3 className="text-lg font-medium text-[var(--pin-text-primary)] mb-4">
              {t('generated')}
            </h3>

            {result?.error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-4">
                {result.error}
              </div>
            )}

            {result?.imageUrl ? (
              <div className="space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden bg-[var(--pin-bg-muted)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.imageUrl}
                    alt="Generated"
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* 生成时间统计 */}
                {result.duration !== undefined && (
                  <div className="flex items-center justify-center gap-2 text-sm text-[var(--pin-text-secondary)]">
                    <AppIcon name="clock" className="w-4 h-4" />
                    <span>生成耗时: {result.duration} 秒</span>
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  className="pin-btn-base pin-btn-secondary w-full px-4 py-2"
                >
                  <span className="flex items-center justify-center gap-2">
                    <AppIcon name="download" className="w-4 h-4" />
                    {t('download')}
                  </span>
                </button>
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-[var(--pin-bg-muted)] flex items-center justify-center">
                <div className="text-center text-[var(--pin-text-tertiary)]">
                  <AppIcon name="image" className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>{generating ? progress?.status : t('promptPlaceholder')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
