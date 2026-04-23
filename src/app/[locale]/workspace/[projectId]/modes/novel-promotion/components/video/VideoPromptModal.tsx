'use client'

import { useTranslations } from 'next-intl'
import { VideoPanel } from './types'
import { AppIcon } from '@/components/ui/icons'

interface VideoPromptModalProps {
  panel: VideoPanel | undefined
  panelIndex: number
  editValue: string
  onEditValueChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function VideoPromptModal({
  panel,
  panelIndex,
  editValue,
  onEditValueChange,
  onSave,
  onCancel
}: VideoPromptModalProps) {
  const t = useTranslations('video')
  if (!panel) return null

  return (
    <div className="fixed inset-0 bg-[var(--pin-overlay)] flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-[var(--pin-bg-surface)] rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="bg-[var(--pin-bg-surface)] border-b px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold">{t('promptModal.title', { number: panelIndex + 1 })}</h3>
          <button onClick={onCancel} className="text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]">
            <AppIcon name="close" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto app-scrollbar flex-1 min-h-0">
          {/* 镜头信息 */}
          <div className="p-3 bg-[var(--pin-bg-muted)] rounded-lg text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[var(--pin-text-tertiary)]">{t('promptModal.shotType')}</span>
              <span className="px-2 py-0.5 bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)] rounded">{panel.textPanel?.shot_type}</span>
              {panel.textPanel?.camera_move && (
                <span className="px-2 py-0.5 bg-[var(--pin-tone-warning-bg)] text-[var(--pin-tone-warning-fg)] rounded">{panel.textPanel.camera_move}</span>
              )}
              {panel.textPanel?.duration && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] rounded">
                  <AppIcon name="clock" className="w-3 h-3" />
                  {panel.textPanel.duration}
                  {t('promptModal.duration')}
                </span>
              )}
            </div>
            <div><span className="text-[var(--pin-text-tertiary)]">{t('promptModal.location')}</span>{panel.textPanel?.location || t('promptModal.locationUnknown')}</div>
            <div><span className="text-[var(--pin-text-tertiary)]">{t('promptModal.characters')}</span>{panel.textPanel?.characters?.join('、') || t('promptModal.charactersNone')}</div>
            <div><span className="text-[var(--pin-text-tertiary)]">{t('promptModal.description')}</span>{panel.textPanel?.description}</div>
            {panel.textPanel?.text_segment && (
              <div className="border-t pt-2 mt-2">
                <span className="text-[var(--pin-text-tertiary)]">{t('promptModal.text')}</span>
                <span className="text-[var(--pin-text-secondary)] italic">&quot;{panel.textPanel.text_segment}&quot;</span>
              </div>
            )}
          </div>

          {/* 视频提示词编辑 */}
          <div>
            <label className="block text-sm font-medium text-[var(--pin-text-secondary)] mb-2">
              {t('promptModal.promptLabel')}
            </label>
            <textarea
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--pin-stroke-strong)] rounded-lg focus:ring-2 focus:ring-[var(--pin-tone-info-fg)] focus:border-[var(--pin-stroke-focus)]"
              rows={6}
              placeholder={t('promptModal.placeholder')}
            />
            <p className="text-xs text-[var(--pin-text-tertiary)] mt-1">
              {t('promptModal.tip')}
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              className="pin-btn-base px-4 py-2 bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-muted)]"
            >
              {t('promptModal.cancel')}
            </button>
            <button
              onClick={onSave}
              className="pin-btn-base px-4 py-2 bg-[var(--pin-color-brand)] text-white hover:bg-[var(--pin-color-brand-hover)]"
            >
              {t('promptModal.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
