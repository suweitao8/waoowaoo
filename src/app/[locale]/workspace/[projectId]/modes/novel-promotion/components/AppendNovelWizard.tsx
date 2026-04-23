'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { apiFetch } from '@/lib/api-fetch'
import { readApiErrorMessage } from '@/lib/api/read-error-message'
import {
  detectEncodingAndDecode,
  preprocessNovelContent,
  splitNovelByChapters,
  type ChapterSplit
} from '@/lib/novel-import/novel-parser'

export interface AppendNovelWizardProps {
  projectId: string
  onClose: () => void
  onComplete: (newEpisodeIds: string[]) => void
  existingEpisodeCount: number
}

export interface ImportProgress {
  current: number
  total: number
  status: string
}

export default function AppendNovelWizard({
  projectId,
  onClose,
  onComplete,
  existingEpisodeCount
}: AppendNovelWizardProps) {
  const t = useTranslations('smartImport')
  const tc = useTranslations('common')

  // State
  const [novelFile, setNovelFile] = useState<File | null>(null)
  const [novelContent, setNovelContent] = useState<string>('')
  const [novelFileName, setNovelFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [chapters, setChapters] = useState<ChapterSplit[]>([])
  const [stage, setStage] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [progress, setProgress] = useState<ImportProgress | null>(null)

  // File handling
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['.txt', '.md', '.text']
    const fileName = file.name.toLowerCase()
    const isValidType = validTypes.some(ext => fileName.endsWith(ext))
    if (!isValidType) {
      setError(t('invalidFileType'))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('fileTooLarge'))
      return
    }

    try {
      // Read file and detect encoding
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const rawContent = detectEncodingAndDecode(uint8Array)
      const content = preprocessNovelContent(rawContent)

      setNovelFile(file)
      setNovelContent(content)
      setNovelFileName(file.name)
      setError(null)

      // Auto-split chapters
      const splitChapters = splitNovelByChapters(content)
      setChapters(splitChapters)

      if (splitChapters.length === 0) {
        setError(t('noChaptersFound'))
      }
    } catch {
      setError(t('fileReadError'))
    }
  }, [t])

  // Clear file
  const handleClearFile = useCallback(() => {
    setNovelFile(null)
    setNovelContent('')
    setNovelFileName('')
    setChapters([])
    setError(null)
  }, [])

  // Start import
  const handleStartImport = useCallback(async () => {
    if (chapters.length === 0) return

    setStage('importing')
    const total = chapters.length
    const newEpisodeIds: string[] = []

    try {
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i]

        setProgress({
          current: i + 1,
          total,
          status: t('importingChapter', { title: ch.title, current: i + 1, total })
        })

        const response = await apiFetch(`/api/novel-promotion/${projectId}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ch.title,
            description: `${ch.content.length}${t('charsCount')}`,
            novelText: ch.content
          }),
        })

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response, t('importFailed')))
        }

        const data = await response.json()
        newEpisodeIds.push(data.episode.id)
      }

      setProgress({ current: total, total, status: t('importComplete') })

      // Short delay before closing
      setTimeout(() => {
        onComplete(newEpisodeIds)
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('importFailed'))
      setStage('preview')
    }
  }, [chapters, existingEpisodeCount, onComplete, projectId, t])

  const loadingTaskState = resolveTaskPresentationState({
    phase: 'processing',
    intent: 'generate',
    resource: 'text',
    hasOutput: false,
  })

  return (
    <div className="fixed inset-0 pin-overlay flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="pin-surface-modal p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--pin-text-primary)]">{t('appendNovel.title')}</h2>
          <button
            onClick={onClose}
            className="text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)] transition-colors"
          >
            <AppIcon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Stage */}
        {stage === 'upload' && (
          <>
            <div className="mb-4">
              <label className="pin-field-label block mb-2">{t('upload.label')}</label>
              {!novelFile ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--pin-stroke-strong)] rounded-xl cursor-pointer hover:border-[var(--pin-tone-info-fg)]/40 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <AppIcon name="upload" className="w-8 h-8 mb-2 text-[var(--pin-text-tertiary)]" />
                    <p className="text-sm text-[var(--pin-text-secondary)]">
                      {t('upload.dragDrop')} <span className="font-semibold">{t('upload.browse')}</span>
                    </p>
                    <p className="text-xs text-[var(--pin-text-tertiary)]">{t('upload.formats')}</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.text"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 border border-[var(--pin-stroke-strong)] rounded-xl bg-[var(--pin-bg-muted)]">
                  <div className="flex items-center gap-2">
                    <AppIcon name="fileText" className="w-5 h-5 text-[var(--pin-tone-info-fg)]" />
                    <span className="text-sm text-[var(--pin-text-primary)] truncate max-w-[300px]">{novelFileName}</span>
                    <span className="text-xs text-[var(--pin-text-tertiary)]">({Math.round(novelContent.length / 1024)}KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-[var(--pin-text-tertiary)] hover:text-[var(--pin-tone-danger-fg)] transition-colors"
                  >
                    <AppIcon name="close" className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Chapter Preview */}
            {chapters.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-[var(--pin-text-secondary)] mb-2">
                  {t('appendNovel.chaptersFound', { count: chapters.length })}
                </p>
                <div className="bg-[var(--pin-bg-muted)] rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                  {chapters.slice(0, 10).map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="flex-shrink-0 w-8 font-medium text-[var(--pin-tone-info-fg)]">
                        {existingEpisodeCount + idx + 1}
                      </span>
                      <span className="text-[var(--pin-text-secondary)] truncate flex-1">{ch.title}</span>
                      <span className="text-[var(--pin-text-tertiary)] text-xs">
                        ~{ch.content.length.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {chapters.length > 10 && (
                    <div className="text-xs text-[var(--pin-text-tertiary)] text-center pt-2">
                      {t('appendNovel.moreChapters', { count: chapters.length - 10 })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-[var(--pin-tone-danger-bg)] border border-[var(--pin-stroke-danger)] rounded-lg text-[var(--pin-tone-danger-fg)] text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="pin-btn-base pin-btn-secondary px-4 py-2"
              >
                {tc('cancel')}
              </button>
              <button
                type="button"
                onClick={() => setStage('preview')}
                className="pin-btn-base pin-btn-primary px-4 py-2 disabled:opacity-50"
                disabled={chapters.length === 0}
              >
                {tc('next')}
              </button>
            </div>
          </>
        )}

        {/* Preview Stage */}
        {stage === 'preview' && (
          <>
            <div className="mb-4">
              <p className="text-[var(--pin-text-secondary)] mb-2">
                {t('appendNovel.confirmImport', { count: chapters.length, start: existingEpisodeCount + 1, end: existingEpisodeCount + chapters.length })}
              </p>
              <div className="bg-[var(--pin-bg-muted)] rounded-xl p-4 max-h-64 overflow-y-auto space-y-2">
                {chapters.map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="flex-shrink-0 w-8 font-medium text-[var(--pin-tone-info-fg)]">
                      {existingEpisodeCount + idx + 1}
                    </span>
                    <span className="text-[var(--pin-text-secondary)] truncate flex-1">{ch.title}</span>
                    <span className="text-[var(--pin-text-tertiary)] text-xs">
                      ~{ch.content.length.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStage('upload')}
                className="pin-btn-base pin-btn-secondary px-4 py-2"
              >
                {tc('back')}
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                className="pin-btn-base pin-btn-primary px-4 py-2"
              >
                {t('appendNovel.startImport')}
              </button>
            </div>
          </>
        )}

        {/* Importing Stage */}
        {stage === 'importing' && progress && (
          <div className="py-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--pin-bg-muted)]">
                <TaskStatusInline state={loadingTaskState} className="[&>span]:sr-only" />
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-[var(--pin-text-primary)] font-medium">{progress.status}</p>
              <p className="text-sm text-[var(--pin-text-tertiary)]">{progress.current}/{progress.total}</p>
            </div>
            <div className="w-full h-2 bg-[var(--pin-stroke-base)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
