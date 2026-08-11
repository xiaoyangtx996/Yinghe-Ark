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
        <div className="w-[220px] flex-shrink-0 border-r border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)]">
            <div className="p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--glass-text-secondary)]">{t('folders')}</h3>
                    <button
                        onClick={onCreateFolder}
                        className="glass-btn-base glass-btn-primary flex h-6 w-6 items-center justify-center rounded-[8px]"
                        title={t('newFolder')}
                    >
                        <PlusIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-0.5">
                    {/* 所有资产 */}
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors ${selectedFolderId === null
                                ? 'border-[var(--film-gold)] bg-[rgba(224,163,106,0.1)] text-[var(--glass-text-primary)]'
                                : 'border-transparent text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                            }`}
                    >
                        <FolderIcon className="w-4 h-4" />
                        <span className="truncate">{t('allAssets')}</span>
                    </button>

                    {/* 文件夹列表 */}
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className={`group flex items-center gap-2 border-l-2 px-3 py-2 transition-colors ${selectedFolderId === folder.id
                                    ? 'border-[var(--film-gold)] bg-[rgba(224,163,106,0.1)] text-[var(--glass-text-primary)]'
                                    : 'border-transparent text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
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
                                    className="glass-btn-base glass-btn-soft h-5 w-5 rounded flex items-center justify-center"
                                    title={t('editFolder')}
                                >
                                    <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteFolder(folder.id)
                                    }}
                                    className="glass-btn-base glass-btn-tone-danger h-5 w-5 rounded flex items-center justify-center"
                                    title={t('deleteFolder')}
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {folders.length === 0 && (
                        <div className="text-xs text-[var(--glass-text-tertiary)] text-center py-4">
                            {t('noFolders')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
