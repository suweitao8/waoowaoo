import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { AppIcon } from '@/components/ui/icons'
import type { PromptStageRuntime } from './hooks/usePromptStageActions'
import PromptListCardView from './PromptListCardView'
import PromptListTableView from './PromptListTableView'

interface PromptListPanelProps {
  runtime: PromptStageRuntime
}

export default function PromptListPanel({ runtime }: PromptListPanelProps) {
  const t = useTranslations('storyboard')
  const tCommon = useTranslations('common')

  const {
    viewMode,
    onViewModeChange,
    onGenerateAllImages,
    isAnyTaskRunning,
    runningCount,
    batchTaskRunningState,
    onBack,
    shots,
  } = runtime

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              disabled={isAnyTaskRunning}
              className="pin-btn-base px-4 py-2 bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-muted)] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <AppIcon name="chevronLeft" className="w-4 h-4" />
              <span>{tCommon('back')}</span>
            </button>
          )}
          <span className="text-sm text-[var(--pin-text-secondary)]">
            {t('header.panels')}: {shots.length}
            {runningCount > 0 && (
              <span className="ml-2 text-[var(--pin-tone-info-fg)] font-medium">
                ({runningCount} {t('group.generating')})
              </span>
            )}
          </span>
          <button
            onClick={onGenerateAllImages}
            disabled={isAnyTaskRunning}
            className="pin-btn-base px-4 py-2 bg-[var(--pin-tone-success-fg)] text-white hover:bg-[var(--pin-tone-success-fg)] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isAnyTaskRunning ? (
              <TaskStatusInline state={batchTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
            ) : (
              t('group.generateAll')
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewModeChange('card')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'card' ? 'bg-[var(--pin-color-brand)] text-white' : 'bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-muted)]'}`}
          >
            {tCommon('preview')}
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-[var(--pin-color-brand)] text-white' : 'bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-muted)]'}`}
          >
            {t('common.status')}
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <PromptListCardView runtime={runtime} />
      ) : (
        <PromptListTableView runtime={runtime} />
      )}
    </>
  )
}
