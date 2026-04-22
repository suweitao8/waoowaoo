'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import VoiceDesignGeneratorSection from '@/components/voice/VoiceDesignGeneratorSection'
import {
  DEFAULT_VOICE_SCHEME_COUNT,
  generateVoiceDesignOptions,
  type GeneratedVoice,
  type VoiceDesignMutationPayload,
  type VoiceDesignMutationResult,
} from '@/components/voice/voice-design-shared'

interface NarratorVoiceConfigSectionProps {
  narratorVoiceId: string | null
  narratorVoiceType: string | null
  narratorVoicePrompt: string | null
  onUpdateNarratorVoice: (voiceId: string, voicePrompt: string) => void
  onDesignVoice: (payload: VoiceDesignMutationPayload) => Promise<VoiceDesignMutationResult>
}

export function NarratorVoiceConfigSection({
  narratorVoiceId,
  narratorVoiceType,
  narratorVoicePrompt,
  onUpdateNarratorVoice,
  onDesignVoice,
}: NarratorVoiceConfigSectionProps) {
  const t = useTranslations('configModal.narratorVoice')

  const [isExpanded, setIsExpanded] = useState(!narratorVoiceId)
  const [voicePrompt, setVoicePrompt] = useState(narratorVoicePrompt || t('defaultNarratorPrompt'))
  const [previewText, setPreviewText] = useState(t('defaultPreviewText'))
  const [schemeCount, setSchemeCount] = useState(String(DEFAULT_VOICE_SCHEME_COUNT))
  const [isDesignSubmitting, setIsDesignSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedVoices, setGeneratedVoices] = useState<GeneratedVoice[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const hasVoice = !!narratorVoiceId

  const handleGenerate = async () => {
    if (!voicePrompt.trim()) {
      setError(t('selectStyle'))
      return
    }

    setIsDesignSubmitting(true)
    setError(null)
    setGeneratedVoices([])
    setSelectedIndex(null)

    try {
      const voices = await generateVoiceDesignOptions({
        count: schemeCount,
        voicePrompt,
        previewText,
        defaultPreviewText: t('defaultPreviewText'),
        onDesignVoice,
      })
      setGeneratedVoices(voices)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('designFailed')
      setError(message === 'VOICE_DESIGN_EMPTY_RESULT' ? t('designFailed') : (message || t('designFailed')))
    } finally {
      setIsDesignSubmitting(false)
    }
  }

  const handlePlayVoice = (index: number) => {
    if (playingIndex === index && audioRef.current) {
      audioRef.current.pause()
      setPlayingIndex(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    setPlayingIndex(index)
    const audio = new Audio(generatedVoices[index].audioUrl)
    audioRef.current = audio
    audio.onended = () => setPlayingIndex(null)
    audio.onerror = () => setPlayingIndex(null)
    void audio.play()
  }

  const handleConfirmSelection = () => {
    if (selectedIndex !== null && generatedVoices[selectedIndex]) {
      const voice = generatedVoices[selectedIndex]
      onUpdateNarratorVoice(voice.voiceId, voicePrompt)
      setGeneratedVoices([])
      setSelectedIndex(null)
      setPlayingIndex(null)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }

  const handleRedesign = () => {
    setVoicePrompt(narratorVoicePrompt || t('defaultNarratorPrompt'))
    setGeneratedVoices([])
    setSelectedIndex(null)
    setError(null)
  }

  return (
    <div className="glass-surface-soft p-5 sm:p-6 space-y-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AppIcon name="mic" className="w-4 h-4 text-[var(--glass-tone-info-fg)]" />
          <h3 className="text-sm font-semibold text-[var(--glass-text-tertiary)]">{t('title')}</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasVoice ? (
            <span className="glass-chip glass-chip-success text-xs px-2 py-0.5">
              <AppIcon name="check" className="w-3 h-3" />
              {t('configured')}
            </span>
          ) : (
            <span className="glass-chip glass-chip-neutral text-xs px-2 py-0.5">
              {t('notConfigured')}
            </span>
          )}
          <AppIcon
            name={isExpanded ? 'chevronUp' : 'chevronDown'}
            className="w-4 h-4 text-[var(--glass-text-tertiary)]"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-4 pt-2">
          <p className="text-xs text-[var(--glass-text-tertiary)]">{t('subtitle')}</p>

          {hasVoice && !generatedVoices.length ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRedesign}
                className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <AppIcon name="refresh" className="w-4 h-4" />
                {t('redesign')}
              </button>
              {narratorVoiceType && (
                <span className="text-xs text-[var(--glass-text-tertiary)]">
                  {narratorVoiceType === 'qwen-designed' ? 'AI 设计音色' : narratorVoiceType}
                </span>
              )}
            </div>
          ) : (
            <VoiceDesignGeneratorSection
              voicePrompt={voicePrompt}
              onVoicePromptChange={setVoicePrompt}
              previewText={previewText}
              onPreviewTextChange={setPreviewText}
              schemeCount={schemeCount}
              onSchemeCountChange={setSchemeCount}
              isSubmitting={isDesignSubmitting}
              submittingState={isDesignSubmitting ? { phase: 'processing', intent: 'generate', resource: 'audio', hasOutput: false, mode: 'placeholder', isRunning: true, isError: false, labelKey: null } : null}
              error={error}
              generatedVoices={generatedVoices}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
              playingIndex={playingIndex}
              onPlayVoice={handlePlayVoice}
              showPresets={false}
              onGenerate={() => {
                void handleGenerate()
              }}
              footer={generatedVoices.length > 0 ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleGenerate()
                    }}
                    disabled={isDesignSubmitting}
                    className="glass-btn-base glass-btn-secondary flex-1 py-2 rounded-lg text-sm"
                  >
                    {t('regenerate')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSelection}
                    disabled={selectedIndex === null}
                    className="glass-btn-base glass-btn-tone-success flex-1 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {t('confirmUse')}
                  </button>
                </div>
              ) : undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}
