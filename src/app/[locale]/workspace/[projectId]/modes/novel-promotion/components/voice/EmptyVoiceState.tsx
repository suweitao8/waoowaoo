'use client'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

interface EmptyVoiceStateProps {
    onAnalyze: () => void
    analyzing: boolean
}

export default function EmptyVoiceState({
    onAnalyze,
    analyzing
}: EmptyVoiceStateProps) {
    const t = useTranslations('voice')
    const analyzingState = analyzing
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'analyze',
            resource: 'text',
            hasOutput: false,
        })
        : null

    return (
        <div className="pin-surface-elevated p-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]">
                <AppIcon name="micOutline" className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-[var(--pin-text-secondary)] mb-2">{t("empty.title")}</h3>
            <p className="text-[var(--pin-text-tertiary)] mb-6">{t("empty.description")}</p>
            <button
                onClick={onAnalyze}
                disabled={analyzing}
                className="pin-btn-base pin-btn-primary inline-flex items-center gap-2 px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {analyzing ? (
                    <TaskStatusInline state={analyzingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                ) : (
                    <>
                        <AppIcon name="clipboardCheck" className="w-5 h-5" />
                        {t("empty.analyzeButton")}
                    </>
                )}
            </button>
            <p className="text-sm text-[var(--pin-text-tertiary)] mt-6">
                {t("empty.hint")}
            </p>
        </div>
    )
}
