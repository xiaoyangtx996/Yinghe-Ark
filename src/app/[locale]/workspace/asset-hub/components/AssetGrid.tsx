'use client'

import { useTranslations } from 'next-intl'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CharacterCard } from './CharacterCard'
import { LocationCard } from './LocationCard'
import { VoiceCard } from './VoiceCard'
import { AppIcon } from '@/components/ui/icons'
import { groupAssetsByKind } from '@/lib/assets/grouping'
import type { AssetSummary } from '@/lib/assets/contracts'

export type AssetHubFilter = 'all' | 'character' | 'location' | 'voice' | 'sfx' | 'prop'

export function AddAssetDropdown({
    onAddCharacter,
    onAddLocation,
    onAddProp,
    onAddVoice,
    size = 'md',
}: {
    onAddCharacter: () => void
    onAddLocation: () => void
    onAddProp: () => void
    onAddVoice: () => void
    size?: 'md' | 'lg'
}) {
    const t = useTranslations('assetHub')
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        setMenuPos({
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
        })
    }, [])

    useEffect(() => {
        if (!open) return
        updatePosition()
        const handleClickOutside = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                menuRef.current?.contains(e.target as Node)
            ) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open, updatePosition])

    const handleSelect = (action: () => void) => {
        setOpen(false)
        action()
    }

    const menuItems = [
        { label: t('addCharacter'), icon: 'user' as const, action: onAddCharacter },
        { label: t('addLocation'), icon: 'image' as const, action: onAddLocation },
        { label: t('addProp'), icon: 'diamond' as const, action: onAddProp },
        { label: t('addVoice'), icon: 'mic' as const, action: onAddVoice },
    ]

    const sizeClass = size === 'lg'
        ? 'px-5 py-2.5 text-[14px] rounded-xl'
        : 'px-4 py-2 text-sm rounded-lg'

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`glass-btn-base glass-btn-primary flex items-center gap-1.5 ${sizeClass}`}
            >
                <AppIcon name="plus" className="w-4 h-4" />
                <span>{t('addAsset')}</span>
                <AppIcon
                    name="chevronDown"
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && menuPos && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[9999] min-w-[160px] py-1.5 rounded-xl bg-[var(--glass-bg-surface-modal)] shadow-[var(--glass-shadow-md)] border border-[var(--glass-stroke-base)] animate-in fade-in-0 zoom-in-95 duration-150"
                    style={{ top: menuPos.top, right: menuPos.right }}
                >
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => handleSelect(item.action)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--glass-text-primary)] hover:bg-[var(--glass-bg-muted)] transition-colors cursor-pointer"
                        >
                            <AppIcon name={item.icon} className="w-4 h-4 text-[var(--glass-text-tertiary)]" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </>
    )
}

interface AssetGridProps {
    assets: AssetSummary[]
    loading: boolean
    filter: AssetHubFilter
    onAddCharacter: () => void
    onAddLocation: () => void
    onAddProp: () => void
    onAddVoice: () => void
    /** When set, empty state uses a single category CTA instead of the multi-type dropdown */
    primaryAddLabel?: string
    onPrimaryAdd?: () => void
    onImageClick?: (url: string) => void
    onImageEdit?: (type: 'character' | 'location' | 'prop', id: string, name: string, imageIndex: number, appearanceIndex?: number) => void
    onVoiceDesign?: (characterId: string, characterName: string) => void
    onCharacterEdit?: (character: unknown, appearance: unknown) => void
    onLocationEdit?: (location: unknown, imageIndex: number) => void
    onPropEdit?: (prop: unknown, imageIndex: number) => void
    onVoiceSelect?: (characterId: string) => void
}

export function useAssetKindCounts(assets: AssetSummary[]) {
    const grouped = groupAssetsByKind(assets)
    return {
        character: grouped.character.length,
        location: grouped.location.length,
        prop: grouped.prop.length,
        voice: grouped.voice.length,
        sfx: 0,
        all: grouped.character.length + grouped.location.length + grouped.prop.length + grouped.voice.length,
    }
}

export function AssetGrid({
    assets,
    loading,
    filter,
    onAddCharacter,
    onAddLocation,
    onAddProp,
    onAddVoice,
    primaryAddLabel,
    onPrimaryAdd,
    onImageClick,
    onImageEdit,
    onVoiceDesign,
    onCharacterEdit,
    onLocationEdit,
    onPropEdit,
    onVoiceSelect,
}: AssetGridProps) {
    const t = useTranslations('assetHub')
    const [sectionPage, setSectionPage] = useState({
        character: 1,
        location: 1,
        prop: 1,
        voice: 1,
    })

    const groupedAssets = groupAssetsByKind(assets)
    const characters = groupedAssets.character.map((asset) => ({
        id: asset.id,
        name: asset.name,
        folderId: asset.folderId,
        customVoiceUrl: asset.voice.customVoiceUrl,
        appearances: asset.variants.map((variant) => ({
            id: variant.id,
            appearanceIndex: variant.index,
            changeReason: variant.label,
            description: variant.description,
            imageUrl: variant.renders.find((render) => render.isSelected)?.imageUrl
                ?? variant.renders[0]?.imageUrl
                ?? null,
            imageUrls: variant.renders.map((render) => render.imageUrl ?? '').filter((value) => value.length > 0),
            selectedIndex: variant.selectionState.selectedRenderIndex,
            effectiveSelectedIndex: variant.selectionState.selectedRenderIndex,
            previousImageUrl: variant.renders[0]?.previousImageUrl ?? null,
            previousImageUrls: variant.renders.map((render) => render.previousImageUrl ?? '').filter((value) => value.length > 0),
            imageTaskRunning: asset.taskState.isRunning || variant.taskState.isRunning || variant.renders.some((render) => render.taskState.isRunning),
        })),
    }))
    const locations = groupedAssets.location.map((asset) => ({
        id: asset.id,
        name: asset.name,
        summary: asset.summary,
        folderId: asset.folderId,
        images: asset.variants.map((variant) => ({
            id: variant.id,
            imageIndex: variant.index,
            description: variant.description,
            imageUrl: variant.renders[0]?.imageUrl ?? null,
            previousImageUrl: variant.renders[0]?.previousImageUrl ?? null,
            isSelected: variant.renders[0]?.isSelected ?? false,
            imageTaskRunning: asset.taskState.isRunning || variant.taskState.isRunning || variant.renders.some((render) => render.taskState.isRunning),
        })),
    }))
    const props = groupedAssets.prop.map((asset) => ({
        id: asset.id,
        name: asset.name,
        summary: asset.summary,
        folderId: asset.folderId,
        images: asset.variants.map((variant) => ({
            id: variant.id,
            imageIndex: variant.index,
            description: variant.description,
            imageUrl: variant.renders[0]?.imageUrl ?? null,
            previousImageUrl: variant.renders[0]?.previousImageUrl ?? null,
            isSelected: variant.renders[0]?.isSelected ?? false,
            imageTaskRunning: asset.taskState.isRunning || variant.taskState.isRunning || variant.renders.some((render) => render.taskState.isRunning),
        })),
    }))
    const voices = groupedAssets.voice.map((asset) => ({
        id: asset.id,
        name: asset.name,
        description: asset.voiceMeta.description,
        voiceId: asset.voiceMeta.voiceId,
        voiceType: asset.voiceMeta.voiceType,
        customVoiceUrl: asset.voiceMeta.customVoiceUrl,
        voicePrompt: asset.voiceMeta.voicePrompt,
        gender: asset.voiceMeta.gender,
        language: asset.voiceMeta.language,
        folderId: asset.folderId,
    }))

    const pageSize = 40
    const paginate = <T,>(rows: T[], page: number) => {
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
        const safePage = Math.min(Math.max(page, 1), totalPages)
        const start = (safePage - 1) * pageSize
        return {
            items: rows.slice(start, start + pageSize),
            page: safePage,
            totalPages,
        }
    }

    const setPage = (type: 'character' | 'location' | 'prop' | 'voice', page: number) => {
        setSectionPage((prev) => ({ ...prev, [type]: page }))
    }

    const charactersPage = paginate(characters, sectionPage.character)
    const locationsPage = paginate(locations, sectionPage.location)
    const propsPage = paginate(props, sectionPage.prop)
    const voicesPage = paginate(voices, sectionPage.voice)

    const renderPagination = (type: 'character' | 'location' | 'prop' | 'voice', page: number, totalPages: number) => {
        if (totalPages <= 1) return null
        return (
            <div className="mt-4 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => setPage(type, page - 1)}
                    disabled={page <= 1}
                    className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs rounded-md disabled:cursor-not-allowed"
                >
                    {t('pagination.previous')}
                </button>
                <span className="text-xs text-[var(--glass-text-tertiary)]">
                    {page} / {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => setPage(type, page + 1)}
                    disabled={page >= totalPages}
                    className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs rounded-md disabled:cursor-not-allowed"
                >
                    {t('pagination.next')}
                </button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-[var(--glass-radius-lg)] border border-[var(--glass-stroke-base)]">
                        <div className="aspect-square animate-pulse bg-[var(--glass-bg-muted)]" />
                        <div className="space-y-2 p-3">
                            <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--glass-bg-muted)]" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--glass-bg-muted)]" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const isEmpty = characters.length === 0 && locations.length === 0 && props.length === 0 && voices.length === 0

    if (filter === 'sfx') {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center px-6">
                <AppIcon name="volumeOff" className="mb-3 h-8 w-8 text-[var(--glass-text-tertiary)]" />
                <p className="text-[15px] font-medium text-[var(--glass-text-primary)]">{t('sfxEmptyTitle')}</p>
                <p className="mt-1.5 max-w-sm text-[13px] text-[var(--glass-text-secondary)]">{t('sfxEmptyHint')}</p>
            </div>
        )
    }

    if (isEmpty) {
        return (
            <div className="asset-hub-empty">
                <div className="asset-hub-empty__mark" aria-hidden>
                    <div className="asset-hub-empty__folder">
                        <AppIcon name="folderCards" className="h-10 w-10 text-[var(--film-gold)]" />
                    </div>
                    <span className="asset-hub-empty__badge">
                        <AppIcon name="plus" className="h-3.5 w-3.5" />
                    </span>
                    <AppIcon name="sparkles" className="asset-hub-empty__spark asset-hub-empty__spark--a" />
                    <AppIcon name="sparkles" className="asset-hub-empty__spark asset-hub-empty__spark--b" />
                </div>
                <p className="asset-hub-empty__title">{t('emptyState')}</p>
                <p className="asset-hub-empty__desc">{t('emptyStateHint')}</p>
                <div className="mt-6">
                    {onPrimaryAdd && primaryAddLabel ? (
                        <button
                            type="button"
                            onClick={onPrimaryAdd}
                            className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[14px]"
                        >
                            <AppIcon name="plus" className="h-4 w-4" />
                            <span>{primaryAddLabel}</span>
                        </button>
                    ) : (
                        <AddAssetDropdown
                            size="lg"
                            onAddCharacter={onAddCharacter}
                            onAddLocation={onAddLocation}
                            onAddProp={onAddProp}
                            onAddVoice={onAddVoice}
                        />
                    )}
                </div>
            </div>
        )
    }

    const visibleAssetCount = (() => {
        switch (filter) {
            case 'character':
                return characters.length
            case 'location':
                return locations.length + props.length
            case 'prop':
                return props.length
            case 'voice':
                return voices.length
            case 'all':
            default:
                return characters.length + locations.length + props.length + voices.length
        }
    })()

    if (visibleAssetCount === 0) {
        return (
            <div className="flex min-h-[280px] items-center justify-center">
                <p className="text-sm text-[var(--glass-text-tertiary)]">{t('filteredEmptyHint')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {(filter === 'all' || filter === 'character') && characters.length > 0 && (
                <section>
                    {filter === 'all' ? (
                        <h2 className="mb-3 flex items-center gap-2 text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)]">
                            {t('characters')}
                            <span className="glass-chip glass-chip-neutral px-2 py-0.5">{characters.length}</span>
                        </h2>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {charactersPage.items.map((character) => (
                            <CharacterCard
                                key={character.id}
                                character={character}
                                onImageClick={onImageClick}
                                onImageEdit={onImageEdit}
                                onVoiceDesign={onVoiceDesign}
                                onEdit={onCharacterEdit}
                                onVoiceSelect={onVoiceSelect}
                            />
                        ))}
                    </div>
                    {renderPagination('character', charactersPage.page, charactersPage.totalPages)}
                </section>
            )}

            {(filter === 'all' || filter === 'location' || filter === 'prop') && locations.length > 0 && (
                <section>
                    {filter === 'all' ? (
                        <h2 className="mb-3 flex items-center gap-2 text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)]">
                            {t('locations')}
                            <span className="glass-chip glass-chip-neutral px-2 py-0.5">{locations.length}</span>
                        </h2>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {locationsPage.items.map((location) => (
                            <LocationCard
                                key={location.id}
                                location={location}
                                onImageClick={onImageClick}
                                onImageEdit={onImageEdit}
                                onEdit={onLocationEdit}
                            />
                        ))}
                    </div>
                    {renderPagination('location', locationsPage.page, locationsPage.totalPages)}
                </section>
            )}

            {(filter === 'all' || filter === 'location' || filter === 'prop') && props.length > 0 && (
                <section>
                    {filter === 'all' || filter === 'location' ? (
                        <h2 className="mb-3 flex items-center gap-2 text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)]">
                            {t('props')}
                            <span className="glass-chip glass-chip-neutral px-2 py-0.5">{props.length}</span>
                        </h2>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {propsPage.items.map((prop) => (
                            <LocationCard
                                key={prop.id}
                                location={prop}
                                assetType="prop"
                                onImageClick={onImageClick}
                                onImageEdit={onImageEdit}
                                onEdit={onPropEdit}
                            />
                        ))}
                    </div>
                    {renderPagination('prop', propsPage.page, propsPage.totalPages)}
                </section>
            )}

            {(filter === 'all' || filter === 'voice') && voices.length > 0 && (
                <section>
                    {filter === 'all' ? (
                        <h2 className="mb-3 flex items-center gap-2 text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)]">
                            {t('voices')}
                            <span className="glass-chip glass-chip-info px-2 py-0.5">{voices.length}</span>
                        </h2>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {voicesPage.items.map((voice) => (
                            <VoiceCard key={voice.id} voice={voice} />
                        ))}
                    </div>
                    {renderPagination('voice', voicesPage.page, voicesPage.totalPages)}
                </section>
            )}
        </div>
    )
}
