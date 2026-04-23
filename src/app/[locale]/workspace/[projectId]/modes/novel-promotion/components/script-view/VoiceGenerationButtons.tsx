'use client'

import { useState, useCallback } from 'react'
import { AppIcon } from '@/components/ui/icons'

export interface VoiceGenerationButtonsProps {
  /** 内容类型：对话或旁白 */
  type: 'dialogue' | 'voiceover'
  /** 角色名（仅 dialogue 需要） */
  character?: string
  /** 翻译函数 */
  t: (key: string, values?: Record<string, unknown>) => string
  /** 是否有可预览的语音 */
  hasVoice?: boolean
  /** 是否已绑定音色（用于 dialogue） */
  hasVoiceBinding?: boolean
  /** 语音生成回调 */
  onGenerate?: () => Promise<void>
  /** 语音预览回调 */
  onPreview?: () => Promise<void>
  /** 点击未绑定音色时的回调（引导用户绑定） */
  onBindingRequired?: () => void
}

type GenerationState = 'idle' | 'generating' | 'success' | 'error'

export function VoiceGenerationButtons({
  type,
  character,
  t,
  hasVoice = false,
  hasVoiceBinding = true,
  onGenerate,
  onPreview,
  onBindingRequired,
}: VoiceGenerationButtonsProps) {
  const [state, setState] = useState<GenerationState>('idle')

  // 占位语音生成函数（用户后续调试）
  const placeholderGenerate = useCallback(async () => {
    console.log('[VoiceGeneration] 占位函数被调用', { type, character })
    console.log('[VoiceGeneration] 提示：语音生成 API 需要用户后续调试实现')
    // 模拟生成过程
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('[VoiceGeneration] 占位生成完成（实际未调用 API）')
  }, [type, character])

  // 占位语音预览函数
  const placeholderPreview = useCallback(async () => {
    console.log('[VoicePreview] 占位函数被调用', { type, character })
    console.log('[VoicePreview] 提示：语音预览功能需要用户后续调试实现')
  }, [type, character])

  const handleGenerate = async () => {
    // 检查音色绑定
    if (type === 'dialogue' && !hasVoiceBinding) {
      onBindingRequired?.()
      return
    }

    const generateFn = onGenerate || placeholderGenerate
    if (state === 'generating') return

    setState('generating')
    try {
      await generateFn()
      setState('success')
      // 3秒后重置状态
      setTimeout(() => setState('idle'), 3000)
    } catch (error) {
      console.error('语音生成失败:', error)
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const handlePreview = async () => {
    if (!hasVoice) return
    const previewFn = onPreview || placeholderPreview
    try {
      await previewFn()
    } catch (error) {
      console.error('语音预览失败:', error)
    }
  }

  const getGenerateButtonState = () => {
    switch (state) {
      case 'generating':
        return {
          icon: 'loader' as const,
          className: 'animate-spin text-[var(--glass-tone-info-fg)]',
          disabled: true,
        }
      case 'success':
        return {
          icon: 'check' as const,
          className: 'text-green-500',
          disabled: true,
        }
      case 'error':
        return {
          icon: 'alert' as const,
          className: 'text-[var(--glass-tone-danger-fg)]',
          disabled: false,
        }
      default:
        return {
          icon: 'mic' as const,
          className: 'text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)]',
          disabled: false,
        }
    }
  }

  const btnState = getGenerateButtonState()
  const generateTitleKey = type === 'dialogue'
    ? (hasVoiceBinding ? 'script.voice.generateDialogue' : 'script.voice.bindVoiceFirst')
    : 'script.voice.generateVoiceover'

  return (
    <div className="flex items-center gap-1 ml-2 shrink-0">
      {/* 语音生成按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          void handleGenerate()
        }}
        disabled={btnState.disabled}
        className={`
          p-1.5 rounded-lg transition-all
          bg-[var(--glass-bg-surface)] hover:bg-[var(--glass-tone-info-bg)]
          border border-[var(--glass-stroke-base)] hover:border-[var(--glass-stroke-focus)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${btnState.className}
          ${type === 'dialogue' && !hasVoiceBinding ? 'opacity-60' : ''}
        `}
        title={t(generateTitleKey, { character })}
      >
        <AppIcon name={btnState.icon} className="w-4 h-4" />
      </button>

      {/* 语音预览按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          void handlePreview()
        }}
        disabled={!hasVoice}
        className={`
          p-1.5 rounded-lg transition-all
          bg-[var(--glass-bg-surface)] hover:bg-[var(--glass-tone-info-bg)]
          border border-[var(--glass-stroke-base)] hover:border-[var(--glass-stroke-focus)]
          disabled:opacity-40 disabled:cursor-not-allowed
          ${hasVoice
            ? 'text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)]'
            : 'text-[var(--glass-text-tertiary)]'}
        `}
        title={hasVoice ? t('script.voice.preview') : t('script.voice.noVoice')}
      >
        <AppIcon name="play" className="w-4 h-4" />
      </button>
    </div>
  )
}
