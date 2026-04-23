'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { shouldShowError } from '@/lib/error-utils'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import {
    useAiModifyLocationDescription,
    useAiModifyProjectLocationDescription,
    useUpdateLocationName,
    useUpdateLocationSummary,
    useUpdateProjectLocationDescription,
    useUpdateProjectLocationName,
} from '@/lib/query/hooks'
import type { LocationAvailableSlot } from '@/lib/location-available-slots'
import { AiModifyDescriptionField } from './AiModifyDescriptionField'
import { apiFetch } from '@/lib/api-fetch'

export interface LocationEditModalProps {
    mode: 'asset-hub' | 'project'
    locationId: string
    locationName: string
    description: string
    summary?: string
    imagePrompt?: string
    imageIndex?: number
    projectId?: string
    descriptionIndex?: number
    isTaskRunning?: boolean
    onClose: () => void
    onSave: (locationId: string) => void
    onUpdate?: (newDescription: string) => void
    onNameUpdate?: (newName: string) => void
    onRefresh?: () => void
}

export function LocationEditModal({
    mode,
    locationId,
    locationName,
    description,
    summary,
    imagePrompt: initialImagePrompt,
    imageIndex,
    projectId,
    descriptionIndex,
    isTaskRunning = false,
    onClose,
    onSave,
    onUpdate,
    onNameUpdate,
    onRefresh,
}: LocationEditModalProps) {
    const t = useTranslations('assets')

    const resolvedImageIndex = mode === 'asset-hub'
        ? (imageIndex ?? 0)
        : (descriptionIndex ?? 0)

    const [editingName, setEditingName] = useState(locationName)
    const [editingDescription, setEditingDescription] = useState(description || summary || '')
    const [editingImagePrompt, setEditingImagePrompt] = useState(initialImagePrompt || '')
    const [availableSlots, setAvailableSlots] = useState<LocationAvailableSlot[]>([])
    const [aiModifyInstruction, setAiModifyInstruction] = useState('')
    const [isAiModifying, setIsAiModifying] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
    const aiModifyingState = isAiModifying
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'modify',
            resource: 'image',
            hasOutput: true,
        })
        : null
    const savingState = isSaving
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: 'text',
            hasOutput: false,
        })
        : null
    const taskRunningState = isTaskRunning
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'modify',
            resource: 'image',
            hasOutput: true,
        })
        : null
    const generatingPromptState = isGeneratingPrompt
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: 'text',
            hasOutput: false,
        })
        : null

    const updateAssetHubName = useUpdateLocationName()
    const updateProjectName = useUpdateProjectLocationName(projectId ?? '')
    const updateAssetHubSummary = useUpdateLocationSummary()
    const updateProjectDescription = useUpdateProjectLocationDescription(projectId ?? '')
    const aiModifyAssetHub = useAiModifyLocationDescription()
    const aiModifyProject = useAiModifyProjectLocationDescription(projectId ?? '')

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error instanceof Error && error.message) return error.message
        return fallback
    }

    const persistNameIfNeeded = async () => {
        const nextName = editingName.trim()
        if (!nextName || nextName === locationName) return

        if (mode === 'asset-hub') {
            await updateAssetHubName.mutateAsync({ locationId, name: nextName })
        } else {
            await updateProjectName.mutateAsync({ locationId, name: nextName })
        }
        onNameUpdate?.(nextName)
    }

    const persistDescription = async () => {
        if (mode === 'asset-hub') {
            await updateAssetHubSummary.mutateAsync({
                locationId,
                summary: editingDescription,
                availableSlots,
            })
            return
        }

        await updateProjectDescription.mutateAsync({
            locationId,
            imageIndex: resolvedImageIndex,
            description: editingDescription,
            availableSlots,
        })
    }

    const handleGenerateImagePrompt = async () => {
        if (!editingName.trim() && !editingDescription.trim()) return

        try {
            setIsGeneratingPrompt(true)

            if (mode === 'asset-hub') {
                const response = await apiFetch('/api/asset-hub/generate-location-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationId,
                        locationName: editingName,
                        locationDescription: editingDescription,
                        imageIndex: resolvedImageIndex,
                    }),
                })

                const data = await response.json()

                if (!response.ok || !data.success) {
                    const errorMsg = data?.error?.message || data?.message || 'Failed to generate prompt'
                    throw new Error(errorMsg)
                }

                if (data.imagePrompt) {
                    setEditingImagePrompt(data.imagePrompt)
                }
            } else {
                const response = await apiFetch(`/api/novel-promotion/${projectId}/generate-location-prompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationId,
                        locationName: editingName,
                        locationDescription: editingDescription,
                        imageIndex: resolvedImageIndex,
                    }),
                })

                const data = await response.json()

                if (!response.ok || !data.success) {
                    const errorMsg = data?.error?.message || data?.message || 'Failed to generate prompt'
                    throw new Error(errorMsg)
                }

                if (data.imagePrompt) {
                    setEditingImagePrompt(data.imagePrompt)
                }
            }
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(`${t('modal.generatePromptFailed')}: ${getErrorMessage(error, t('errors.failed'))}`)
            }
        } finally {
            setIsGeneratingPrompt(false)
        }
    }

    const handleAiModify = async () => {
        if (!aiModifyInstruction.trim()) return false

        try {
            setIsAiModifying(true)

            if (mode === 'asset-hub') {
                const data = await aiModifyAssetHub.mutateAsync({
                    locationId,
                    imageIndex: resolvedImageIndex,
                    currentDescription: editingDescription,
                    modifyInstruction: aiModifyInstruction,
                })
                if (data?.modifiedDescription) {
                    setEditingDescription(data.modifiedDescription)
                    setAvailableSlots(Array.isArray(data.availableSlots) ? data.availableSlots : [])
                    onUpdate?.(data.modifiedDescription)
                    setAiModifyInstruction('')
                    return true
                }
                return false
            }

            const data = await aiModifyProject.mutateAsync({
                locationId,
                imageIndex: resolvedImageIndex,
                currentDescription: editingDescription,
                modifyInstruction: aiModifyInstruction,
            })
            const nextDescription = data?.modifiedDescription || data?.prompt || ''
            if (nextDescription) {
                setEditingDescription(nextDescription)
                setAvailableSlots(Array.isArray(data.availableSlots) ? data.availableSlots : [])
                onUpdate?.(nextDescription)
                setAiModifyInstruction('')
                return true
            }
            return false
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(`${t('modal.modifyFailed')}: ${getErrorMessage(error, t('errors.failed'))}`)
            }
            return false
        } finally {
            setIsAiModifying(false)
        }
    }

    const handleSaveName = async () => {
        try {
            await persistNameIfNeeded()
            onRefresh?.()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(t('modal.saveName') + t('errors.failed'))
            }
        }
    }

    const handleSaveOnly = async () => {
        try {
            setIsSaving(true)
            await persistNameIfNeeded()
            await persistDescription()

            onUpdate?.(editingDescription)
            onRefresh?.()
            onClose()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(getErrorMessage(error, t('errors.saveFailed')))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveAndGenerate = async () => {
        const savedDescription = editingDescription
        onClose()

        ; (async () => {
            try {
                await persistNameIfNeeded()
                await persistDescription()
                onUpdate?.(savedDescription)
                onRefresh?.()
                onSave(locationId)
            } catch (error: unknown) {
                if (shouldShowError(error)) {
                    alert(getErrorMessage(error, t('errors.saveFailed')))
                }
            }
        })()
    }

    return (
        <div className="fixed inset-0 pin-overlay flex items-center justify-center z-50 p-4">
            <div className="pin-surface-modal max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[var(--pin-text-primary)]">
                            {t('modal.editLocation')} - {locationName}
                        </h3>
                        <button
                            onClick={onClose}
                            className="pin-btn-base pin-btn-soft w-9 h-9 rounded-full text-[var(--pin-text-tertiary)]"
                        >
                            <AppIcon name="close" className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="pin-field-label block">
                            {t('location.name')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="pin-input-base flex-1 px-3 py-2"
                                placeholder={t('modal.namePlaceholder')}
                            />
                            {editingName !== locationName && (
                                <button
                                    onClick={handleSaveName}
                                    disabled={updateAssetHubName.isPending || updateProjectName.isPending || !editingName.trim()}
                                    className="pin-btn-base pin-btn-tone-success px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                >
                                    {(updateAssetHubName.isPending || updateProjectName.isPending)
                                        ? t('smartImport.preview.saving')
                                        : t('modal.saveName')}
                                </button>
                            )}
                        </div>
                    </div>

                    <AiModifyDescriptionField
                        label={t('location.description')}
                        description={editingDescription}
                        onDescriptionChange={setEditingDescription}
                        descriptionPlaceholder={t('modal.descPlaceholder')}
                        aiInstruction={aiModifyInstruction}
                        onAiInstructionChange={setAiModifyInstruction}
                        aiInstructionPlaceholder={t('modal.modifyPlaceholder')}
                        onAiModify={handleAiModify}
                        isAiModifying={isAiModifying}
                        aiModifyingState={aiModifyingState}
                        actionLabel={t('modal.modifyDescription')}
                        cancelLabel={t('common.cancel')}
                    />

                    {/* AI 提示词输入框 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="pin-field-label block">
                                {t('location.imagePrompt')}
                            </label>
                            <button
                                onClick={handleGenerateImagePrompt}
                                disabled={isGeneratingPrompt || (!editingName.trim() && !editingDescription.trim())}
                                className="pin-btn-base pin-btn-tone-info px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                            >
                                {isGeneratingPrompt ? (
                                    <TaskStatusInline state={generatingPromptState} className="text-white [&>span]:text-white [&_svg]:text-white text-xs" />
                                ) : (
                                    <>
                                        <AppIcon name="sparkles" className="w-4 h-4" />
                                        {t('modal.generatePrompt')}
                                    </>
                                )}
                            </button>
                        </div>
                        <textarea
                            value={editingImagePrompt}
                            onChange={(e) => setEditingImagePrompt(e.target.value)}
                            className="pin-textarea-base w-full px-3 py-2 min-h-[100px]"
                            placeholder={t('modal.imagePromptPlaceholder')}
                            rows={4}
                        />
                        <p className="text-xs text-[var(--pin-text-tertiary)]">
                            {t('modal.imagePromptHint')}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end p-4 border-t border-[var(--pin-stroke-base)] bg-[var(--pin-bg-surface-strong)] rounded-b-lg flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="pin-btn-base pin-btn-secondary px-4 py-2 rounded-lg"
                        disabled={isSaving}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSaveOnly}
                        disabled={isSaving || !editingDescription.trim()}
                        className="pin-btn-base pin-btn-tone-info px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <TaskStatusInline state={savingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : (
                            t('modal.saveOnly')
                        )}
                    </button>
                    <button
                        onClick={handleSaveAndGenerate}
                        disabled={isSaving || isTaskRunning || !editingDescription.trim()}
                        className="pin-btn-base pin-btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isTaskRunning ? (
                            <TaskStatusInline state={taskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : (
                            t('modal.saveAndGenerate')
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
