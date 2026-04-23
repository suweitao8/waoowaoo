'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface Folder {
    id: string
    name: string
}

interface FolderModalProps {
    folder: Folder | null
    onClose: () => void
    onSave: (name: string) => void
}

// 内联 SVG 图标
const XMarkIcon = ({ className }: { className?: string }) => (
    <AppIcon name="close" className={className} />
)

export function FolderModal({ folder, onClose, onSave }: FolderModalProps) {
    const t = useTranslations('assetHub')
    const [name, setName] = useState(folder?.name || '')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onSave(name.trim())
        }
    }

    return (
        <div className="fixed inset-0 pin-overlay flex items-center justify-center z-50 p-4">
            <div className="pin-surface-modal max-w-sm w-full">
                <div className="p-5">
                    {/* 标题 */}
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-[var(--pin-text-primary)]">
                            {folder ? t('editFolder') : t('newFolder')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="pin-btn-base pin-btn-soft h-8 w-8 rounded-full flex items-center justify-center text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-[var(--pin-text-secondary)] mb-2">
                                {t('folderName')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('folderNamePlaceholder')}
                                className="pin-input-base w-full px-3 py-2 text-sm"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="pin-btn-base pin-btn-secondary px-4 py-2 rounded-lg text-sm"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="pin-btn-base pin-btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {folder ? t('save') : t('create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
