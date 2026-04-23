'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logWarn as _ulogWarn } from '@/lib/logging/core'
import { AppIcon } from '@/components/ui/icons'
import { VoiceGenerationButtons } from './VoiceGenerationButtons'

interface Clip {
  id: string
  clipIndex?: number
  summary: string
  content: string
  screenplay?: string | null
  characters: string | null
  location: string | null
}

type ScreenplayContentItem =
  | { type: 'action'; text: string }
  | { type: 'dialogue'; character: string; lines: string }
  | { type: 'voiceover'; text: string }

interface ScreenplayScene {
  scene_number?: number
  heading?: {
    int_ext?: string
    location?: string
    time?: string
  }
  description?: string
  content?: ScreenplayContentItem[]
}

interface ScreenplayData {
  scenes: ScreenplayScene[]
}

function parseScreenplay(value: string | null | undefined): ScreenplayData | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    const scenes = (parsed as { scenes?: unknown }).scenes
    if (!Array.isArray(scenes)) return null
    return parsed as ScreenplayData
  } catch (error) {
    _ulogWarn('解析剧本JSON失败:', error)
    return null
  }
}

interface ScriptViewScriptPanelProps {
  clips: Clip[]
  selectedClipId: string | null
  onSelectClip: (clipId: string) => void
  savingClips: Set<string>
  onClipEdit?: (clipId: string) => void
  onClipDelete?: (clipId: string) => void
  onClipUpdate?: (clipId: string, data: Partial<Clip>) => void
  t: (key: string, values?: Record<string, unknown>) => string
  tScript: (key: string, values?: Record<string, unknown>) => string
  tJump?: (key: string, values?: Record<string, unknown>) => string
  /** 角色列表（用于音色绑定查找） */
  characters?: Array<{
    id: string
    name: string
    voiceId?: string | null
    customVoiceUrl?: string | null
  }>
}

function EditableText({
  text,
  onSave,
  className = '',
  tScript,
}: {
  text: string
  onSave: (val: string) => void
  className?: string
  tScript: (key: string, values?: Record<string, unknown>) => string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(text)

  useEffect(() => {
    setValue(text)
  }, [text])

  const handleBlur = () => {
    setIsEditing(false)
    if (value !== text) {
      onSave(value)
    }
  }

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className={`w-full bg-[var(--pin-bg-surface)] border border-[var(--pin-stroke-focus)] rounded p-1 outline-none focus:ring-2 focus:ring-[var(--pin-focus-ring-strong)] ${className}`}
        style={{ resize: 'none', minHeight: '1.5em' }}
      />
    )
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      className={`cursor-text hover:bg-[var(--pin-tone-info-bg)] rounded px-1 -mx-1 transition-colors border border-transparent hover:border-[var(--pin-stroke-focus)] ${className}`}
      title={tScript('screenplay.clickToEdit')}
    >
      {text}
    </div>
  )
}

export default function ScriptViewScriptPanel({
  clips,
  selectedClipId,
  onSelectClip,
  savingClips,
  onClipEdit,
  onClipDelete,
  onClipUpdate,
  t,
  tScript,
  tJump,
  characters = [],
}: ScriptViewScriptPanelProps) {
  const [jumpInput, setJumpInput] = useState('')
  const [jumpError, setJumpError] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clipRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // 检查角色是否绑定了音色
  const checkCharacterVoiceBinding = useCallback((characterName: string): boolean => {
    const char = characters.find((c) => {
      // 支持别名（如 "张三/老张" 格式）
      const aliases = c.name.split('/').map((a) => a.trim())
      return aliases.includes(characterName) || c.name === characterName
    })
    if (!char) return false
    return !!(char.voiceId || char.customVoiceUrl)
  }, [characters])

  const handleScriptSave = async (clipId: string, newContent: string, isJson: boolean) => {
    if (!onClipUpdate) return
    const updateData: Partial<Clip> = isJson ? { screenplay: newContent } : { content: newContent }
    await onClipUpdate(clipId, updateData)
  }

  const handleJumpToChapter = useCallback(() => {
    const inputValue = jumpInput.trim()
    if (!inputValue) {
      return
    }

    // Check if input is a number
    const chapterNum = parseInt(inputValue, 10)

    if (!isNaN(chapterNum) && /^\d+$/.test(inputValue)) {
      // Numeric input: jump to chapter by number
      if (chapterNum < 1) {
        const errorMsg = tJump ? tJump('errorInvalid') : 'Please enter a valid number'
        setJumpError(errorMsg)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current)
        }
        errorTimeoutRef.current = setTimeout(() => setJumpError(null), 2000)
        return
      }

      if (chapterNum > clips.length) {
        const errorMsg = tJump ? tJump('errorOutOfRange', { max: clips.length }) : `Please enter 1-${clips.length}`
        setJumpError(errorMsg)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current)
        }
        errorTimeoutRef.current = setTimeout(() => setJumpError(null), 2000)
        return
      }

      // Clear any existing error
      setJumpError(null)
      const targetClip = clips[chapterNum - 1]
      if (targetClip) {
        onSelectClip(targetClip.id)
        // Scroll to the target clip
        const clipElement = clipRefs.current.get(targetClip.id)
        if (clipElement) {
          clipElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    } else {
      // Text input: search by summary/content
      const searchLower = inputValue.toLowerCase()
      const matchedClip = clips.find((clip) => {
        const summaryMatch = clip.summary?.toLowerCase().includes(searchLower)
        const contentMatch = clip.content?.toLowerCase().includes(searchLower)
        return summaryMatch || contentMatch
      })

      if (matchedClip) {
        setJumpError(null)
        onSelectClip(matchedClip.id)
        const clipElement = clipRefs.current.get(matchedClip.id)
        if (clipElement) {
          clipElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        const errorMsg = tJump ? tJump('errorNotFound') : 'No matching chapter found'
        setJumpError(errorMsg)
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current)
        }
        errorTimeoutRef.current = setTimeout(() => setJumpError(null), 2000)
        return
      }
    }

    setJumpInput('')
  }, [jumpInput, clips, onSelectClip, tJump])

  const handleJumpKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleJumpToChapter()
    }
  }, [handleJumpToChapter])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="col-span-12 lg:col-span-8 flex flex-col min-h-[400px] lg:h-full gap-4">
      <div className="flex justify-between items-end px-2 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-[var(--pin-text-primary)] flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[var(--pin-color-brand)] rounded-full" /> {tScript('scriptBreakdown')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--pin-text-tertiary)]">
            {tScript('splitCount', { count: clips.length })}
          </span>
          {/* Chapter Jump Input */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={handleJumpKeyDown}
                placeholder={tJump ? tJump('placeholder') : '#'}
                className="w-32 px-2 py-1 text-sm bg-[var(--pin-bg-surface)] border border-[var(--pin-stroke-base)] rounded-lg text-[var(--pin-text-primary)] placeholder:text-[var(--pin-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--pin-focus-ring-strong)] focus:border-[var(--pin-stroke-focus)]"
                disabled={clips.length === 0}
              />
            </div>
            {jumpError && (
              <span className="text-xs text-[var(--pin-tone-danger-fg)] mt-1 animate-fadeIn">
                {jumpError}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 pin-surface-elevated overflow-hidden flex flex-col relative w-full min-h-[300px]">
        <div className="lg:absolute lg:inset-0 overflow-y-auto p-6 space-y-4 app-scrollbar">
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--pin-text-tertiary)]">
              <AppIcon name="fileFold" className="h-10 w-10 mb-2" />
              <p>{tScript('noClips')}</p>
            </div>
          ) : (
            clips.map((clip, idx) => {
              const screenplay = parseScreenplay(clip.screenplay)

              return (
                <div
                  key={clip.id}
                  ref={(el) => {
                    if (el) {
                      clipRefs.current.set(clip.id, el)
                    } else {
                      clipRefs.current.delete(clip.id)
                    }
                  }}
                  onClick={() => onSelectClip(clip.id)}
                  className={`
                    group p-5 border-[1.5px] rounded-2xl transition-all cursor-pointer relative bg-[var(--pin-bg-surface)]
                    ${selectedClipId === clip.id
                      ? 'border-[var(--pin-stroke-focus)] shadow-[0_6px_24px_rgba(0,0,0,0.06)] ring-2 ring-[var(--pin-tone-info-bg)]'
                      : 'border-[var(--pin-stroke-base)] hover:border-[var(--pin-stroke-focus)]/40 hover:shadow-md'
                    }
                  `}
                >
                  {savingClips.has(clip.id) && (
                    <div className="absolute top-2 right-2 text-xs text-[var(--pin-tone-info-fg)] flex items-center gap-1 animate-pulse">
                      <AppIcon name="upload" className="w-3 h-3" />
                      {t('preview.saving')}
                    </div>
                  )}

                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded text-[var(--pin-tone-info-fg)] bg-[var(--pin-tone-info-bg)]">
                      {tScript('segment.title', { index: idx + 1 })} {selectedClipId === clip.id && tScript('segment.selected')}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onClipEdit && (
                        <button
                          onClick={() => onClipEdit(clip.id)}
                          className="text-[var(--pin-text-tertiary)] text-xs cursor-pointer hover:text-[var(--pin-tone-info-fg)]"
                        >
                          {t('common.edit')}
                        </button>
                      )}
                      {onClipDelete && (
                        <button
                          onClick={() => onClipDelete(clip.id)}
                          className="text-[var(--pin-text-tertiary)] text-xs cursor-pointer hover:text-[var(--pin-tone-danger-fg)]"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>

                  {screenplay && screenplay.scenes ? (
                    <div className="space-y-3">
                      {screenplay.scenes.map((scene, sceneIdx: number) => (
                        <div key={sceneIdx}>
                          {/* 场景头信息 */}
                          <div className="flex items-center gap-1.5 text-xs mb-2 flex-wrap">
                            <span className="font-bold text-[var(--pin-tone-info-fg)] bg-[var(--pin-tone-info-bg)] px-2 py-0.5 rounded">
                              {tScript('screenplay.scene', { number: scene.scene_number })}
                            </span>
                            <span className="text-[var(--pin-text-tertiary)] flex items-center gap-1">
                              {scene.heading?.int_ext} ·
                              <EditableText
                                text={scene.heading?.location || ''}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].heading.location = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                className="inline"
                                tScript={tScript}
                              />
                              ·
                              <EditableText
                                text={scene.heading?.time || ''}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].heading.time = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                className="inline"
                                tScript={tScript}
                              />
                            </span>
                          </div>

                          {/* 场景描述 */}
                          {scene.description && (
                            <div className="text-xs text-[var(--pin-text-secondary)] bg-[var(--pin-bg-muted)] border-l-2 border-[var(--pin-stroke-base)] px-2 py-1 rounded mb-2">
                              <EditableText
                                text={scene.description}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].description = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                tScript={tScript}
                              />
                            </div>
                          )}

                          {/* 内容流 - 高密度胶囊文本流 */}
                          <div className="flex flex-col gap-2">
                            {scene.content?.map((item, itemIdx: number) => {
                              // action 类型不再渲染，但保留数据结构向后兼容
                              if (item.type === 'action') {
                                return null
                              }
                              if (item.type === 'dialogue') {
                                const hasVoiceBinding = checkCharacterVoiceBinding(item.character)
                                return (
                                  <div key={itemIdx} className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center text-[13px] font-bold text-[var(--pin-tone-info-fg)] bg-[var(--pin-tone-info-bg)] border border-[var(--pin-stroke-focus)]/40 px-2.5 py-0.5 rounded-full shrink-0">
                                      {item.character}
                                    </span>
                                    <div className="text-[15px] text-[var(--pin-text-primary)] font-medium leading-[1.5] flex-1 min-w-0">
                                      <EditableText
                                        text={item.lines}
                                        onSave={(newVal) => {
                                          const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                          newScreenplay.scenes[sceneIdx].content[itemIdx].lines = newVal
                                          void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                        }}
                                        tScript={tScript}
                                      />
                                    </div>
                                    <VoiceGenerationButtons
                                      type="dialogue"
                                      character={item.character}
                                      t={tScript}
                                      hasVoiceBinding={hasVoiceBinding}
                                      onBindingRequired={() => {
                                        console.log(`[Voice] 角色 "${item.character}" 未绑定音色，请先在资产库中绑定`)
                                      }}
                                    />
                                  </div>
                                )
                              }
                              if (item.type === 'voiceover') {
                                return (
                                  <div key={itemIdx} className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center text-[13px] font-bold text-[var(--pin-tone-info-fg)]/80 bg-[var(--pin-tone-info-bg)]/50 border border-[var(--pin-stroke-focus)]/20 px-2.5 py-0.5 rounded-full shrink-0 italic">
                                      {tScript('screenplay.narration')}
                                    </span>
                                    <p className="text-[15px] text-[var(--pin-text-secondary)] font-medium italic leading-[1.5] flex-1">{item.text}</p>
                                    <VoiceGenerationButtons
                                      type="voiceover"
                                      t={tScript}
                                    />
                                  </div>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--pin-text-secondary)] text-sm leading-relaxed">{clip.summary || clip.content}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
