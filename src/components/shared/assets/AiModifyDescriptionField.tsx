'use client'

import { useCallback, useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import type { TaskPresentationState } from '@/lib/task/presentation'
import PinModalShell from '@/components/ui/primitives/PinModalShell'

interface AiModifyDescriptionFieldProps {
  label: string
  description: string
  onDescriptionChange: (value: string) => void
  descriptionPlaceholder: string
  descriptionHeightClassName?: string
  aiInstruction: string
  onAiInstructionChange: (value: string) => void
  aiInstructionPlaceholder: string
  onAiModify: () => Promise<boolean> | boolean
  isAiModifying: boolean
  aiModifyingState: TaskPresentationState | null
  actionLabel: string
  cancelLabel: string
}

export function AiModifyDescriptionField({
  label,
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  descriptionHeightClassName = 'h-48',
  aiInstruction,
  onAiInstructionChange,
  aiInstructionPlaceholder,
  onAiModify,
  isAiModifying,
  aiModifyingState,
  actionLabel,
  cancelLabel,
}: AiModifyDescriptionFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCloseModal = useCallback(() => {
    if (isAiModifying) return
    setIsModalOpen(false)
  }, [isAiModifying])

  const handleConfirmModify = useCallback(async () => {
    const didModify = await Promise.resolve(onAiModify())
    if (didModify) {
      setIsModalOpen(false)
    }
  }, [onAiModify])

  return (
    <div className="space-y-2">
      <label className="pin-field-label block">
        {label}
      </label>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--pin-stroke-base)] bg-[var(--pin-bg-surface)] transition-[border-color,box-shadow,background-color] hover:border-[var(--pin-stroke-strong)] focus-within:border-[var(--pin-stroke-focus)] focus-within:bg-[var(--pin-bg-surface-strong)] focus-within:shadow-[0_0_0_3px_var(--pin-focus-ring)]">
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className={`app-scrollbar w-full resize-none border-0 bg-transparent px-4 py-3 pb-16 text-sm leading-6 text-[var(--pin-text-primary)] outline-none placeholder:text-[var(--pin-text-tertiary)] ${descriptionHeightClassName}`}
          placeholder={descriptionPlaceholder}
          disabled={isAiModifying}
        />
        <div className="pointer-events-none absolute bottom-4 right-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={isAiModifying}
            className="pin-btn-base pointer-events-auto flex h-10 flex-shrink-0 items-center gap-1.5 border border-[var(--pin-stroke-strong)] bg-[var(--pin-bg-surface)] px-3 text-sm transition-all hover:border-[var(--pin-tone-info-fg)]/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAiModifying ? (
              <TaskStatusInline state={aiModifyingState} className="text-[var(--pin-tone-info-fg)] [&>span]:text-[var(--pin-tone-info-fg)] [&_svg]:text-[var(--pin-tone-info-fg)]" />
            ) : (
              <>
                <AppIcon name="sparkles" className="h-4 w-4 text-[#7c3aed]" />
                <span
                  className="font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {actionLabel}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
      <PinModalShell
        open={isModalOpen}
        onClose={handleCloseModal}
        title={actionLabel}
        description={label}
        size="sm"
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isAiModifying}
              className="pin-btn-base pin-btn-secondary px-4 py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmModify()}
              disabled={isAiModifying || !aiInstruction.trim()}
              className="pin-btn-base pin-btn-primary px-4 py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {isAiModifying ? (
                <TaskStatusInline state={aiModifyingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
              ) : (
                actionLabel
              )}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <textarea
            value={aiInstruction}
            onChange={(event) => onAiInstructionChange(event.target.value)}
            placeholder={aiInstructionPlaceholder}
            className="pin-textarea-base app-scrollbar h-32 w-full resize-none px-4 py-3 text-sm"
            disabled={isAiModifying}
            autoFocus
          />
        </div>
      </PinModalShell>
    </div>
  )
}
