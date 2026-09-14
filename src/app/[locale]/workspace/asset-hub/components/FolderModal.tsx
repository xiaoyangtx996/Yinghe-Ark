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
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4">
            <div className="glass-surface-modal max-w-sm w-full">
                <div className="p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h3 className="text-[length:var(--glass-font-size-title)] font-medium text-[var(--glass-text-primary)]">
                            {folder ? t('editFolder') : t('newFolder')}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="glass-btn-base glass-btn-secondary glass-btn-icon rounded-full text-[var(--glass-text-primary)]"
                            aria-label={t('cancel')}
                        >
                            <AppIcon name="close" className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="mb-2 block text-sm font-medium text-[var(--glass-text-secondary)]">
                                {t('folderName')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('folderNamePlaceholder')}
                                className="glass-input-base w-full px-3 py-2 text-sm"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="glass-btn-base glass-btn-secondary rounded-lg px-4 py-2 text-sm"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="glass-btn-base glass-btn-primary rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed"
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
