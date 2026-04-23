'use client'

import { useTranslations } from 'next-intl'
import type { PanelEditData } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/PanelEditForm'
import {
  PinBadge,
  PinField,
  PinTextarea
} from '@/components/ui/primitives'
import type { UiPatternMode } from './types'
import { AppIcon } from '@/components/ui/icons'

export interface PanelEditFormV2Props {
  panelData: PanelEditData
  isSaving?: boolean
  saveStatus?: 'idle' | 'saving' | 'error'
  saveErrorMessage?: string | null
  onRetrySave?: () => void
  onUpdate: (updates: Partial<PanelEditData>) => void
  onOpenCharacterPicker: () => void
  onOpenLocationPicker: () => void
  onRemoveCharacter: (index: number) => void
  onRemoveLocation: () => void
  uiMode?: UiPatternMode
}

export default function PanelEditFormV2({
  panelData,
  isSaving = false,
  saveStatus = 'idle',
  saveErrorMessage = null,
  onRetrySave,
  onUpdate,
  onOpenCharacterPicker,
  onOpenLocationPicker,
  onRemoveCharacter,
  onRemoveLocation,
  uiMode = 'flow'
}: PanelEditFormV2Props) {
  const t = useTranslations('storyboard')

  return (
    <div className={`ui-pattern-form ui-pattern-form-${uiMode} space-y-2`}>
      {saveStatus === 'saving' || isSaving ? (
        <PinBadge tone="info" icon={<span className="h-2 w-2 animate-pulse rounded-full bg-current" />}>
          {t('common.saving')}
        </PinBadge>
      ) : null}
      {saveStatus === 'error' ? (
        <div className="flex flex-wrap items-center gap-2">
          <PinBadge tone="danger">
            {saveErrorMessage || t('common.saveFailed')}
          </PinBadge>
          {onRetrySave ? (
            <button
              type="button"
              onClick={onRetrySave}
              className="pin-btn-base pin-btn-soft px-2 py-1 text-xs"
            >
              {t('common.retrySave')}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* sourceText: 对话/旁白内容 - 必显示 */}
      <PinField label={t('panel.sourceText')}>
        <div className="rounded-[var(--pin-radius-md)] bg-[var(--pin-bg-surface-strong)] px-3 py-2.5">
          <p className="text-sm leading-6 text-[var(--pin-text-secondary)]">&ldquo;{panelData.sourceText || t('panel.noSourceText')}&rdquo;</p>
        </div>
      </PinField>

      <PinField label={t('panel.sceneDescription')}>
        <PinTextarea
          density="compact"
          rows={2}
          value={panelData.description || ''}
          onChange={(event) => onUpdate({ description: event.target.value })}
          placeholder={t('panel.sceneDescriptionPlaceholder')}
        />
      </PinField>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        <PinField
          label={t('panel.locationLabel')}
          actions={
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="inline-flex h-8 w-8 items-center justify-center text-[var(--pin-text-secondary)] hover:text-[var(--pin-tone-info-fg)] transition-colors"
              aria-label={t('panel.editLocation')}
              title={t('panel.editLocation')}
            >
              <AppIcon name="edit" className="h-4 w-4" />
            </button>
          }
        >
          {panelData.location ? (
            <div className="flex flex-wrap gap-1.5">
              <PinBadge tone="success" onRemove={onRemoveLocation}>{panelData.location}</PinBadge>
            </div>
          ) : (
            <p className="text-xs text-[var(--pin-text-tertiary)]">{t('panel.locationNotEdited')}</p>
          )}
        </PinField>

        <PinField
          label={t('panel.characterLabelWithCount', { count: panelData.characters.length })}
          actions={
            <button
              type="button"
              onClick={onOpenCharacterPicker}
              className="inline-flex h-8 w-8 items-center justify-center text-[var(--pin-text-secondary)] hover:text-[var(--pin-tone-info-fg)] transition-colors"
              aria-label={t('panel.editCharacter')}
              title={t('panel.editCharacter')}
            >
              <AppIcon name="edit" className="h-4 w-4" />
            </button>
          }
        >
          {panelData.characters.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {panelData.characters.map((character, index) => (
                <PinBadge key={`${character.name}-${index}`} tone="info" onRemove={() => onRemoveCharacter(index)}>
                  {character.name}({character.appearance})
                </PinBadge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--pin-text-tertiary)]">{t('panel.charactersNotEdited')}</p>
          )}
        </PinField>
      </div>
    </div>
  )
}
