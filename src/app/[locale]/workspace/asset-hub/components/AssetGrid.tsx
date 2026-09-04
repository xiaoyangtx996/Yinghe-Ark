'use client'

import { useTranslations } from 'next-intl'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CharacterCard } from './CharacterCard'
import { LocationCard } from './LocationCard'
import { VoiceCard } from './VoiceCard'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { groupAssetsByKind } from '@/lib/assets/grouping'
import type { AssetSummary } from '@/lib/assets/contracts'
interface AssetGridProps {
    assets: AssetSummary[]
    loading: boolean
    onAddCharacter: () => void
    onAddLocation: () => void
    onAddProp: () => void
    onAddVoice: () => void
    onDownloadAll?: () => void
    isDownloading?: boolean
    selectedFolderId: string | null
    onImageClick?: (url: string) => void
    onImageEdit?: (type: 'character' | 'location' | 'prop', id: string, name: string, imageIndex: number, appearanceIndex?: number) => void
    onVoiceDesign?: (characterId: string, characterName: string) => void
    onCharacterEdit?: (character: unknown, appearance: unknown) => void
    onLocationEdit?: (location: unknown, imageIndex: number) => void
    onPropEdit?: (prop: unknown, imageIndex: number) => void
    onVoiceSelect?: (characterId: string) => void
}

// ─── 新建资产下拉菜单 ──────────────────────────────────
function AddAssetDropdown({
    onAddCharacter,
    onAddLocation,
    onAddProp,
    onAddVoice,
}: {
    onAddCharacter: () => void
    onAddLocation: () => void
    onAddProp: () => void
    onAddVoice: () => void
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

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setOpen((prev) => !prev)}
                className="glass-btn-base glass-btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
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

// 内联 SVG 图标
const PlusIcon = ({ className }: { className?: string }) => (
    <AppIcon name="plus" className={className} />
)

export function AssetGrid({
    assets,
    loading,
    onAddCharacter,
    onAddLocation,
    onAddProp,
    onAddVoice,
    onDownloadAll,
    isDownloading,
    selectedFolderId: _selectedFolderId,
    onImageClick,
    onImageEdit,
    onVoiceDesign,
    onCharacterEdit,
    onLocationEdit,
    onPropEdit,
    onVoiceSelect
}: AssetGridProps) {
    const t = useTranslations('assetHub')
    void _selectedFolderId

    const [filter, setFilter] = useState<'all' | 'character' | 'location' | 'prop' | 'voice'>('all')
    const [sectionPage, setSectionPage] = useState<{ character: number; location: number; prop: number; voice: number }>({
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
            <div className="flex-1 min-w-0">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-[var(--glass-bg-muted)]" />
                    <div className="h-9 w-28 animate-pulse rounded-lg bg-[var(--glass-bg-muted)]" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
            </div>
        )
    }

    const isEmpty = characters.length === 0 && locations.length === 0 && props.length === 0 && voices.length === 0
    const visibleAssetCount = (() => {
        switch (filter) {
            case 'character':
                return characters.length
            case 'location':
                return locations.length
            case 'prop':
                return props.length
            case 'voice':
                return voices.length
            case 'all':
            default:
                return characters.length + locations.length + props.length + voices.length
        }
    })()

    const tabs = [
        { id: 'all', label: t('allAssets') },
        { id: 'character', label: t('characters') },
        { id: 'location', label: t('locations') },
        { id: 'prop', label: t('props') },
        { id: 'voice', label: t('voices') },
    ]

    return (
        <div className="flex-1 min-w-0">
            {/* Header: 筛选 Tab + 操作按钮 */}
            <div className="flex items-center justify-between mb-6">
                {/* 左侧筛选 */}
                <SegmentedControl
                    options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
                    value={filter}
                    onChange={(val) => setFilter(val as 'all' | 'character' | 'location' | 'prop' | 'voice')}
                    layout="compact"
                    className="min-w-max"
                />

                {/* 右侧操作按钮 */}
                <div className="flex items-center gap-3">
                    {onDownloadAll && (
                        <button
                            onClick={onDownloadAll}
                            disabled={isDownloading || isEmpty}
                            title={t('downloadAllTitle')}
                            className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-lg text-sm disabled:cursor-not-allowed"
                        >
                            <AppIcon name={isDownloading ? 'refresh' : 'download'} className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`} />
                            <span>{isDownloading ? t('downloading') : t('downloadAll')}</span>
                        </button>
                    )}
                    <AddAssetDropdown
                        onAddCharacter={onAddCharacter}
                        onAddLocation={onAddLocation}
                        onAddProp={onAddProp}
                        onAddVoice={onAddVoice}
                    />
                </div>
            </div>

            {isEmpty ? (
                /* 空状态 */
                <div className="mx-auto max-w-md rounded-[var(--glass-radius-md)] border border-dashed border-[var(--glass-stroke-base)] bg-[color-mix(in_srgb,var(--glass-bg-muted)_55%,transparent)] px-6 py-10 text-center">
                    <PlusIcon className="mx-auto mb-4 h-8 w-8 text-[var(--glass-text-secondary)]" />
                    <p className="mb-2 text-[length:var(--glass-font-size-title)] font-medium text-[var(--glass-text-primary)]">{t('emptyState')}</p>
                    <p className="mx-auto max-w-sm text-[length:var(--glass-font-size-body)] leading-[var(--glass-line-height-body)] text-[var(--glass-text-secondary)]">{t('emptyStateHint')}</p>
                    <div className="mt-6 flex justify-center">
                        <AddAssetDropdown
                            onAddCharacter={onAddCharacter}
                            onAddLocation={onAddLocation}
                            onAddProp={onAddProp}
                            onAddVoice={onAddVoice}
                        />
                    </div>
                </div>
            ) : visibleAssetCount === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center">
                    <p className="text-sm text-[var(--glass-text-tertiary)]">
                        {t('filteredEmptyHint')}
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 角色区块 */}
                    {(filter === 'all' || filter === 'character') && characters.length > 0 && (
                        <section>
                            <h2 className="text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)] mb-3 flex items-center gap-2">
                                {t('characters')}
                                <span className="glass-chip glass-chip-neutral px-2 py-0.5">{characters.length}</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

                    {/* 场景区块 */}
                    {(filter === 'all' || filter === 'location') && locations.length > 0 && (
                        <section>
                            <h2 className="text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)] mb-3 flex items-center gap-2">
                                {t('locations')}
                                <span className="glass-chip glass-chip-neutral px-2 py-0.5">{locations.length}</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

                    {(filter === 'all' || filter === 'prop') && props.length > 0 && (
                        <section>
                            <h2 className="text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)] mb-3 flex items-center gap-2">
                                {t('props')}
                                <span className="glass-chip glass-chip-neutral px-2 py-0.5">{props.length}</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

                    {/* 音色区块 */}
                    {(filter === 'all' || filter === 'voice') && voices.length > 0 && (
                        <section>
                            <h2 className="text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-text-primary)] mb-3 flex items-center gap-2">
                                {t('voices')}
                                <span className="glass-chip glass-chip-info px-2 py-0.5">{voices.length}</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {voicesPage.items.map((voice) => (
                                    <VoiceCard
                                        key={voice.id}
                                        voice={voice}
                                    />
                                ))}
                            </div>
                            {renderPagination('voice', voicesPage.page, voicesPage.totalPages)}
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
