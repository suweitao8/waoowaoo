import TaskStatusInline from '@/components/task/TaskStatusInline'
import { useTranslations } from 'next-intl'
import type { PromptStageRuntime } from './hooks/usePromptStageActions'

interface PromptEditorPanelProps {
  runtime: PromptStageRuntime
}

export default function PromptEditorPanel({ runtime }: PromptEditorPanelProps) {
  const tStoryboard = useTranslations('storyboard')
  const tNovelPromotion = useTranslations('novelPromotion')
  const {
    onAppendContent,
    appendContent,
    setAppendContent,
    isAppending,
    appendTaskRunningState,
    handleAppendSubmit,
    isAnyTaskRunning,
    onNext,
  } = runtime

  return (
    <>
      {onAppendContent && (
        <div className="mt-8 p-6 bg-[var(--pin-bg-muted)] rounded-lg border-2 border-dashed border-[var(--pin-stroke-strong)]">
          <h3 className="text-lg font-semibold text-[var(--pin-text-primary)] mb-3">{tStoryboard('prompts.appendTitle')}</h3>
          <p className="text-sm text-[var(--pin-text-secondary)] mb-4">
            {tStoryboard('prompts.appendDescription')}
          </p>
          <textarea
            value={appendContent}
            onChange={(e) => setAppendContent(e.target.value)}
            placeholder={tStoryboard('panelActions.pasteSrtPlaceholder')}
            disabled={isAppending}
            className="w-full h-48 p-4 border border-[var(--pin-stroke-strong)] rounded-lg resize-none focus:ring-2 focus:ring-[var(--pin-tone-info-fg)] focus:border-[var(--pin-stroke-focus)] disabled:bg-[var(--pin-bg-muted)] disabled:cursor-not-allowed font-mono text-sm"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAppendSubmit}
              disabled={isAppending || !appendContent.trim()}
              className="pin-btn-base px-6 py-3 bg-[var(--pin-tone-success-fg)] text-white hover:bg-[var(--pin-tone-success-fg)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isAppending ? (
                <TaskStatusInline state={appendTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
              ) : (
                tStoryboard('prompts.appendSubmit')
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end items-center pt-4">
        <button
          onClick={onNext}
          disabled={isAnyTaskRunning}
          className="pin-btn-base px-6 py-2 bg-[var(--pin-color-brand)] text-white hover:bg-[var(--pin-color-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tNovelPromotion('buttons.enterVideoGeneration')}
        </button>
      </div>
    </>
  )
}
