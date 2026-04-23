'use client'

import { useTranslations } from 'next-intl'
import { PinButton, PinBadge, PinSurface } from '@/components/ui/primitives'
import type { UiPatternMode } from './types'

export interface StoryboardHeaderV2Props {
  totalSegments: number
  totalPanels: number
  isDownloadingImages: boolean
  runningCount: number
  pendingPanelCount: number
  isBatchSubmitting: boolean
  onDownloadAllImages: () => void
  onGenerateAllPanels: () => void
  onBack: () => void
  uiMode?: UiPatternMode
}

export default function StoryboardHeaderV2({
  totalSegments,
  totalPanels,
  isDownloadingImages,
  runningCount,
  pendingPanelCount,
  isBatchSubmitting,
  onDownloadAllImages,
  onGenerateAllPanels,
  onBack,
  uiMode = 'flow'
}: StoryboardHeaderV2Props) {
  const t = useTranslations('storyboard')

  return (
    <PinSurface variant="elevated" className={`ui-pattern-header ui-pattern-header-${uiMode} space-y-4`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--pin-text-primary)]">{t('header.storyboardPanel')} (V2)</h3>
          <p className="text-sm text-[var(--pin-text-secondary)]">
            {t('header.segmentsCount', { count: totalSegments })} {t('header.panelsCount', { count: totalPanels })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {runningCount > 0 ? (
            <PinBadge tone="info" icon={<span className="h-2 w-2 animate-pulse rounded-full bg-current" />}>
              {t('header.generatingStatus', { count: runningCount })}
            </PinBadge>
          ) : null}
          <PinBadge tone="neutral">{t('header.concurrencyLimit', { count: 10 })}</PinBadge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pendingPanelCount > 0 ? (
          <PinButton
            variant="primary"
            loading={isBatchSubmitting}
            onClick={onGenerateAllPanels}
            disabled={runningCount > 0}
          >
            {t('header.generatePendingPanels', { count: pendingPanelCount })}
          </PinButton>
        ) : null}

        <PinButton
          variant="secondary"
          loading={isDownloadingImages}
          onClick={onDownloadAllImages}
          disabled={totalPanels === 0}
        >
          {t('header.downloadAll')}
        </PinButton>

        <PinButton variant="ghost" onClick={onBack}>{t('header.back')}</PinButton>
      </div>
    </PinSurface>
  )
}
