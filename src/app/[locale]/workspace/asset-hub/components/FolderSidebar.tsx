'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface Folder {
    id: string
    name: string
}

interface FolderSidebarProps {
    folders: Folder[]
    selectedFolderId: string | null
    onSelectFolder: (folderId: string | null) => void
    onCreateFolder: () => void
    onEditFolder: (folder: Folder) => void
    onDeleteFolder: (folderId: string) => void
}

// 内联 SVG 图标
const FolderIcon = ({ className }: { className?: string }) => (
    <AppIcon name="folder" className={className} />
)

const PlusIcon = ({ className }: { className?: string }) => (
    <AppIcon name="plus" className={className} />
)

const PencilIcon = ({ className }: { className?: string }) => (
    <AppIcon name="edit" className={className} />
)

const TrashIcon = ({ className }: { className?: string }) => (
    <AppIcon name="trash" className={className} />
)

export function FolderSidebar({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onEditFolder,
    onDeleteFolder
}: FolderSidebarProps) {
    const t = useTranslations('assetHub')

    return (
        <div className="w-56 flex-shrink-0">
            <div className="pin-surface p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--pin-text-secondary)]">{t('folders')}</h3>
                    <button
                        onClick={onCreateFolder}
                        className="pin-btn-base pin-btn-primary h-6 w-6 rounded-full flex items-center justify-center"
                        title={t('newFolder')}
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    {/* 所有资产 */}
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${selectedFolderId === null
                                ? 'bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]'
                                : 'text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-muted)]'
                            }`}
                    >
                        <FolderIcon className="w-4 h-4" />
                        <span className="truncate">{t('allAssets')}</span>
                    </button>

                    {/* 文件夹列表 */}
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${selectedFolderId === folder.id
                                    ? 'bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]'
                                    : 'text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-muted)]'
                                }`}
                        >
                            <button
                                onClick={() => onSelectFolder(folder.id)}
                                className="flex-1 flex items-center gap-2 text-left text-sm min-w-0"
                            >
                                <FolderIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{folder.name}</span>
                            </button>

                            {/* 操作按钮 */}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEditFolder(folder)
                                    }}
                                    className="pin-btn-base pin-btn-soft h-5 w-5 rounded flex items-center justify-center"
                                    title={t('editFolder')}
                                >
                                    <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteFolder(folder.id)
                                    }}
                                    className="pin-btn-base pin-btn-tone-danger h-5 w-5 rounded flex items-center justify-center"
                                    title={t('deleteFolder')}
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {folders.length === 0 && (
                        <div className="text-xs text-[var(--pin-text-tertiary)] text-center py-4">
                            {t('noFolders')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
