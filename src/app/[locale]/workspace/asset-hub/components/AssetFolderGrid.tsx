'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { GlobalFolder } from '@/lib/query/hooks'

export const UNCATEGORIZED_FOLDER_ID = '__uncategorized__'

export type FolderCardItem = {
  id: string
  name: string
  assetCount: number
  isUncategorized?: boolean
}

export function AssetFolderGrid({
  folders,
  loading,
  onOpenFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: {
  folders: FolderCardItem[]
  loading?: boolean
  onOpenFolder: (folderId: string) => void
  onCreateFolder: () => void
  onEditFolder?: (folder: GlobalFolder) => void
  onDeleteFolder?: (folder: GlobalFolder) => void
}) {
  const t = useTranslations('assetHub')

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="glass-surface min-h-[132px] animate-pulse p-4"
            aria-hidden
          >
            <div className="mb-3 h-9 w-9 rounded-[var(--glass-radius-sm)] bg-[var(--glass-bg-muted)]" />
            <div className="mb-2 h-3.5 w-3/4 rounded bg-[var(--glass-bg-muted)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--glass-bg-muted)]" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <button
        type="button"
        onClick={onCreateFolder}
        className="glass-surface group flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2.5 border-dashed px-3 py-4 transition-colors hover:border-[var(--film-gold)]/50"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--film-gold)] text-[var(--glass-text-on-accent)] transition-transform group-hover:scale-105">
          <AppIcon name="plus" className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-[var(--glass-text-secondary)] transition-colors group-hover:text-[var(--glass-text-primary)]">
          {t('newFolder')}
        </span>
        <span className="text-center text-[11.5px] leading-snug text-[var(--glass-text-tertiary)]">
          {t('newFolderHint')}
        </span>
      </button>

      {folders.map((folder) => (
        <div key={folder.id} className="group relative">
          <button
            type="button"
            onClick={() => onOpenFolder(folder.id)}
            className="glass-surface flex min-h-[132px] w-full cursor-pointer flex-col items-start gap-3 px-3.5 py-3.5 text-left transition-colors hover:border-[var(--film-gold)]/45"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-bg-muted)] text-[var(--film-gold-2)]">
              <AppIcon
                name={folder.isUncategorized ? 'folderCards' : 'folder'}
                className="h-4 w-4"
              />
            </span>
            <span className="w-full min-w-0">
              <span className="block truncate text-[13.5px] font-semibold leading-snug text-[var(--glass-text-primary)]">
                {folder.name}
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-[var(--glass-text-tertiary)]">
                {t('folderAssetCount', { count: folder.assetCount })}
              </span>
            </span>
          </button>

          {!folder.isUncategorized && (onEditFolder || onDeleteFolder) ? (
            <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {onEditFolder ? (
                <button
                  type="button"
                  className="glass-btn-base glass-btn-secondary rounded-lg p-1.5"
                  title={t('editFolder')}
                  aria-label={t('editFolder')}
                  onClick={(event) => {
                    event.stopPropagation()
                    onEditFolder({ id: folder.id, name: folder.name })
                  }}
                >
                  <AppIcon name="edit" className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {onDeleteFolder ? (
                <button
                  type="button"
                  className="glass-btn-base glass-btn-secondary rounded-lg p-1.5"
                  title={t('deleteFolder')}
                  aria-label={t('deleteFolder')}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteFolder({ id: folder.id, name: folder.name })
                  }}
                >
                  <AppIcon name="trash" className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
