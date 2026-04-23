'use client'

import { useTranslations } from 'next-intl'
import type { PanelEditData } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/PanelEditForm'
import type { StoryboardPanel } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/storyboard/hooks/useStoryboardState'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import { PinButton, PinBadge, PinSurface } from '@/components/ui/primitives'
import PanelEditFormV2 from './PanelEditFormV2'
import type { UiPatternMode } from './types'

interface PanelCandidateData {
  candidates: string[]
  selectedIndex: number
}

export interface PanelCardV2Props {
  panel: StoryboardPanel
  panelData: PanelEditData
  imageUrl: string | null
  globalPanelNumber: number
  isSaving: boolean
  isDeleting: boolean
  isModifying: boolean
  isTaskRunning: boolean
  failedError: string | null
  candidateData: PanelCandidateData | null
  onUpdate: (updates: Partial<PanelEditData>) => void
  onDelete: () => void
  onOpenCharacterPicker: () => void
  onOpenLocationPicker: () => void
  onRemoveCharacter: (index: number) => void
  onRemoveLocation: () => void
  onRegeneratePanelImage: (panelId: string, count?: number, force?: boolean) => void
  onOpenEditModal: () => void
  onOpenAIDataModal: () => void
  onSelectCandidateIndex: (panelId: string, index: number) => void
  onConfirmCandidate: (panelId: string, imageUrl: string) => Promise<void>
  onCancelCandidate: (panelId: string) => void
  onClearError: () => void
  uiMode?: UiPatternMode
}

export default function PanelCardV2({
  panel,
  panelData,
  imageUrl,
  globalPanelNumber,
  isSaving,
  isDeleting,
  isModifying,
  isTaskRunning,
  failedError,
  candidateData,
  onUpdate,
  onDelete,
  onOpenCharacterPicker,
  onOpenLocationPicker,
  onRemoveCharacter,
  onRemoveLocation,
  onRegeneratePanelImage,
  onOpenEditModal,
  onOpenAIDataModal,
  onSelectCandidateIndex,
  onConfirmCandidate,
  onCancelCandidate,
  onClearError,
  uiMode = 'flow'
}: PanelCardV2Props) {
  const t = useTranslations('storyboard')
  const selectedCandidate =
    candidateData && candidateData.candidates[candidateData.selectedIndex]
      ? candidateData.candidates[candidateData.selectedIndex]
      : null

  return (
    <PinSurface
      variant="elevated"
      padded={false}
      className={`ui-pattern-panel-card ui-pattern-panel-card-${uiMode} relative overflow-hidden`}
    >
      <div className="relative">
        <div className="aspect-[9/16] w-full overflow-hidden bg-[rgba(255,255,255,0.35)]">
          {isDeleting || isModifying || isTaskRunning ? (
            <div className="flex h-full items-center justify-center">
              <PinBadge tone={isDeleting ? 'danger' : 'info'}>
                {isDeleting
                  ? t('common.deleting')
                  : isModifying
                    ? t('common.editing')
                    : t('image.generating')}
              </PinBadge>
            </div>
          ) : failedError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <PinBadge tone="danger">{t('image.failed')}</PinBadge>
              <p className="text-xs text-[var(--pin-text-secondary)]">{failedError}</p>
              <PinButton size="sm" variant="ghost" onClick={onClearError}>{t('common.cancel')}</PinButton>
            </div>
          ) : selectedCandidate ? (
            <MediaImageWithLoading
              src={selectedCandidate}
              alt="candidate"
              containerClassName="h-full w-full"
              className="h-full w-full object-cover"
            />
          ) : imageUrl ? (
            <MediaImageWithLoading
              src={imageUrl}
              alt="panel"
              containerClassName="h-full w-full"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PinButton size="sm" variant="secondary" onClick={() => onRegeneratePanelImage(panel.id, 1)}>
                {t('panel.generateImage')}
              </PinButton>
            </div>
          )}
        </div>

        <div className="absolute left-2 top-2 flex items-center gap-2">
          <PinBadge tone="neutral">#{globalPanelNumber}</PinBadge>
          <PinBadge tone="info">{panel.shot_type || t('panel.noShotType')}</PinBadge>
        </div>

        <div className="absolute right-2 top-2">
          <PinButton size="sm" variant="danger" onClick={onDelete}>{t('common.delete')}</PinButton>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-2">
          <PinButton size="sm" variant="secondary" onClick={() => onRegeneratePanelImage(panel.id, 1, isTaskRunning)}>
            {t('image.regenerate')}
          </PinButton>
          <PinButton size="sm" variant="secondary" onClick={onOpenEditModal}>{t('image.editImage')}</PinButton>
          <PinButton size="sm" variant="secondary" onClick={onOpenAIDataModal}>{t('aiData.title')}</PinButton>

          {candidateData ? (
            <>
              <PinButton size="sm" variant="ghost" onClick={() => onCancelCandidate(panel.id)}>{t('image.cancelSelection')}</PinButton>
              <PinButton
                size="sm"
                variant="primary"
                onClick={() => {
                  const candidate = candidateData.candidates[candidateData.selectedIndex]
                  if (candidate) {
                    void onConfirmCandidate(panel.id, candidate)
                  }
                }}
              >
                {t('image.confirmCandidate')}
              </PinButton>
              <div className="ml-auto flex gap-1">
                {candidateData.candidates.slice(0, 4).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSelectCandidateIndex(panel.id, index)}
                    className={`h-2.5 w-2.5 rounded-full ${index === candidateData.selectedIndex ? 'bg-[var(--pin-color-brand)]' : 'bg-[var(--pin-bg-surface)]/80 border border-[var(--pin-stroke-base)]'}`}
                    aria-label={`candidate-${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="p-3">
        <PanelEditFormV2
          panelData={panelData}
          isSaving={isSaving}
          onUpdate={onUpdate}
          onOpenCharacterPicker={onOpenCharacterPicker}
          onOpenLocationPicker={onOpenLocationPicker}
          onRemoveCharacter={onRemoveCharacter}
          onRemoveLocation={onRemoveLocation}
          uiMode={uiMode}
        />
      </div>
    </PinSurface>
  )
}
