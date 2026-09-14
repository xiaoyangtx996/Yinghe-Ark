'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { apiFetch } from '@/lib/api-fetch'
import JSZip from 'jszip'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import ConfirmDialog from '@/components/ConfirmDialog'
import { AssetGrid, type AssetHubFilter } from './components/AssetGrid'
import { AssetHubDashboard } from './components/AssetHubChrome'
import { AssetFolderGrid, UNCATEGORIZED_FOLDER_ID } from './components/AssetFolderGrid'
import { CharacterCreationModal, LocationCreationModal, PropCreationModal, CharacterEditModal, LocationEditModal, PropEditModal } from '@/components/shared/assets'
import { FolderModal } from './components/FolderModal'
import ImagePreviewModal from '@/components/ui/ImagePreviewModal'
import ImageEditModal from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/ImageEditModal'
import VoiceDesignDialog from './components/VoiceDesignDialog'
import VoiceCreationModal from './components/VoiceCreationModal'
import VoicePickerDialog from './components/VoicePickerDialog'
import {
    useAssets,
    useAssetActions,
    useRefreshAssets,
    useGlobalFolders,
    useSSE,
    type GlobalFolderKind,
} from '@/lib/query/hooks'
import { queryKeys } from '@/lib/query/keys'
import { AppIcon } from '@/components/ui/icons'
import { Link } from '@/i18n/navigation'
import { useImageGenerationCount } from '@/lib/image-generation/use-image-generation-count'

type AssetHubCategory = 'all' | GlobalFolderKind

const FIXED_CATEGORIES: { id: AssetHubCategory; labelKey: 'allAssets' | 'characters' | 'locations' | 'voices' | 'soundEffects'; icon: 'folderCards' | 'user' | 'image' | 'mic' | 'volumeOff' }[] = [
    { id: 'all', labelKey: 'allAssets', icon: 'folderCards' },
    { id: 'character', labelKey: 'characters', icon: 'user' },
    { id: 'location', labelKey: 'locations', icon: 'image' },
    { id: 'voice', labelKey: 'voices', icon: 'mic' },
    { id: 'sfx', labelKey: 'soundEffects', icon: 'volumeOff' },
]

export default function AssetHubPage() {
    const t = useTranslations('assetHub')
    const queryClient = useQueryClient()
    const { count: characterGenerationCount } = useImageGenerationCount('character')
    const { count: locationGenerationCount } = useImageGenerationCount('location')

    const [category, setCategory] = useState<AssetHubCategory>('all')
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
    const [showFolderModal, setShowFolderModal] = useState(false)
    const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null)
    const [folderPendingDelete, setFolderPendingDelete] = useState<{ id: string; name: string } | null>(null)
    const [folderHint, setFolderHint] = useState(false)

    const { data: folders = [], isLoading: foldersLoading } = useGlobalFolders()
    const isFolderBrowser = category !== 'all' && selectedFolderId === null
    const isUncategorizedView = selectedFolderId === UNCATEGORIZED_FOLDER_ID
    const queryFolderId =
        category === 'all' || isFolderBrowser || isUncategorizedView
            ? null
            : selectedFolderId

    const { data: assets = [], isLoading: assetsLoading } = useAssets({
        scope: 'global',
        folderId: queryFolderId,
    })
    const characterActions = useAssetActions({ scope: 'global', kind: 'character' })
    const locationActions = useAssetActions({ scope: 'global', kind: 'location' })
    const propActions = useAssetActions({ scope: 'global', kind: 'prop' })
    const refreshAssets = useRefreshAssets({ scope: 'global' })

    const loading = foldersLoading || assetsLoading
    useSSE({ projectId: 'global-asset-hub', enabled: true })

    const categoryFolders = useMemo(() => {
        if (category === 'all') return []
        return folders.filter((folder) => folder.kind === category || folder.kind == null)
    }, [folders, category])

    const matchesCategory = (kind: string) => {
        if (category === 'character') return kind === 'character'
        if (category === 'location') return kind === 'location' || kind === 'prop'
        if (category === 'voice') return kind === 'voice'
        if (category === 'sfx') return false
        return true
    }

    const folderCards = useMemo(() => {
        if (category === 'all') return []
        const uncategorizedCount = assets.filter(
            (asset) => asset.folderId == null && matchesCategory(asset.kind),
        ).length
        const cards = [
            {
                id: UNCATEGORIZED_FOLDER_ID,
                name: t('uncategorizedFolder'),
                assetCount: uncategorizedCount,
                isUncategorized: true,
            },
            ...categoryFolders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                assetCount: assets.filter(
                    (asset) => asset.folderId === folder.id && matchesCategory(asset.kind),
                ).length,
            })),
        ]
        return cards
    }, [assets, category, categoryFolders, t])

    const folderScopedAssets = useMemo(() => {
        if (isUncategorizedView) {
            return assets.filter((asset) => asset.folderId == null)
        }
        return assets
    }, [assets, isUncategorizedView])

    const gridFilter: AssetHubFilter = category === 'all' ? 'all' : category

    const creationFolderId =
        !selectedFolderId || isUncategorizedView ? null : selectedFolderId

    const selectCategory = (next: AssetHubCategory) => {
        setCategory(next)
        setSelectedFolderId(null)
    }

    // 弹窗状态
    const [showAddCharacter, setShowAddCharacter] = useState(false)
    const [showAddLocation, setShowAddLocation] = useState(false)
    const [showAddProp, setShowAddProp] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [imageEditModal, setImageEditModal] = useState<{
        type: 'character' | 'location' | 'prop'
        id: string
        name: string
        imageIndex: number
        appearanceIndex?: number
    } | null>(null)

    const [voiceDesignCharacter, setVoiceDesignCharacter] = useState<{
        id: string
        name: string
        hasExistingVoice: boolean
    } | null>(null)

    // 音色库弹窗状态
    const [showAddVoice, setShowAddVoice] = useState(false)
    const [voicePickerCharacterId, setVoicePickerCharacterId] = useState<string | null>(null)
    const [isDownloading, setIsDownloading] = useState(false)


    // 编辑角色弹窗状态
    const [characterEditModal, setCharacterEditModal] = useState<{
        characterId: string
        characterName: string
        appearanceId: string
        appearanceIndex: number
        changeReason: string
        artStyle: string | null
        description: string
    } | null>(null)

    // 编辑场景弹窗状态
    const [locationEditModal, setLocationEditModal] = useState<{
        locationId: string
        locationName: string
        summary: string
        imageIndex: number
        artStyle: string | null
        description: string
    } | null>(null)
    const [propEditModal, setPropEditModal] = useState<{
        propId: string
        propName: string
        summary: string
        description: string
        variantId?: string
    } | null>(null)

    const categoryAddConfig = (() => {
        switch (category) {
            case 'character':
                return { label: t('addCharacter'), open: () => setShowAddCharacter(true) }
            case 'location':
                return { label: t('addLocation'), open: () => setShowAddLocation(true) }
            case 'voice':
                return { label: t('addVoice'), open: () => setShowAddVoice(true) }
            default:
                return null
        }
    })()

    const handleCreateFolder = async (name: string) => {
        if (category === 'all') return
        try {
            const res = await apiFetch('/api/asset-hub/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, kind: category }),
            })
            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.folders() })
                setShowFolderModal(false)
            }
        } catch (error) {
            _ulogError('创建文件夹失败', error)
        }
    }

    const handleUpdateFolder = async (folderId: string, name: string) => {
        try {
            const res = await apiFetch(`/api/asset-hub/folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.folders() })
                setEditingFolder(null)
                setShowFolderModal(false)
            }
        } catch (error) {
            _ulogError('更新文件夹失败', error)
        }
    }

    const handleDeleteFolder = async (folderId: string) => {
        try {
            const res = await apiFetch(`/api/asset-hub/folders/${folderId}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                if (selectedFolderId === folderId) {
                    setSelectedFolderId(null)
                }
                queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.folders() })
                queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.all() })
            }
        } catch (error) {
            _ulogError('删除文件夹失败', error)
        } finally {
            setFolderPendingDelete(null)
        }
    }

    const openNewFolder = () => {
        if (category === 'all') {
            setFolderHint(true)
            window.setTimeout(() => setFolderHint(false), 2400)
            return
        }
        setEditingFolder(null)
        setShowFolderModal(true)
    }

    // 打开图片编辑弹窗
    const handleOpenImageEdit = (type: 'character' | 'location' | 'prop', id: string, name: string, imageIndex: number, appearanceIndex?: number) => {
        setImageEditModal({ type, id, name, imageIndex, appearanceIndex })
    }


    // 处理图片编辑确认 - 使用 mutation
    const handleImageEdit = async (modifyPrompt: string, extraImageUrls?: string[]) => {
        if (!imageEditModal) return

        const { type, id, imageIndex, appearanceIndex } = imageEditModal
        setImageEditModal(null)

        if (type === 'character' && appearanceIndex !== undefined) {
            void characterActions.modifyRender({
                id,
                appearanceIndex,
                imageIndex,
                modifyPrompt,
                extraImageUrls
            }).catch(() => {
                alert(t('editFailed'))
            })
        } else if (type === 'location') {
            void locationActions.modifyRender({
                id,
                imageIndex,
                modifyPrompt,
                extraImageUrls
            }).catch(() => {
                alert(t('editFailed'))
            })
        } else if (type === 'prop') {
            void propActions.modifyRender({
                id,
                imageIndex,
                modifyPrompt,
                extraImageUrls,
            }).catch(() => {
                alert(t('editFailed'))
            })
        }
    }

    // 打开 AI 声音设计对话框
    const handleOpenVoiceDesign = (characterId: string, characterName: string) => {
        const character = assets.find((asset) => asset.kind === 'character' && asset.id === characterId)
        setVoiceDesignCharacter({
            id: characterId,
            name: characterName,
            hasExistingVoice: character?.kind === 'character' ? !!character.voice.customVoiceUrl : false,
        })
    }

    // 保存 AI 设计的声音
    const handleVoiceDesignSave = async (voiceId: string, audioBase64: string) => {
        if (!voiceDesignCharacter) return

        try {
            const res = await apiFetch('/api/asset-hub/character-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: voiceDesignCharacter.id,
                    voiceId,
                    audioBase64
                })
            })

            if (res.ok) {
                alert(t('voiceDesignSaved', { name: voiceDesignCharacter.name }))
                queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.characters() })
                refreshAssets()
            } else {
                const data = await res.json()
                alert(
                    typeof data.error === 'string'
                        ? t('saveVoiceFailedDetail', { error: data.error })
                        : t('saveVoiceFailed'),
                )
            }
        } catch (error) {
            _ulogError('保存声音失败:', error)
            alert(t('saveVoiceFailed'))
        }
    }

    // 打开角色编辑弹窗
    const handleOpenCharacterEdit = (character: unknown, appearance: unknown) => {
        const typedCharacter = character as {
            id: string
            name: string
            appearances: Array<{
                id: string
                appearanceIndex: number
                changeReason: string
                description: string | null
            }>
        }
        const typedAppearance = appearance as {
            id: string
            appearanceIndex: number
            changeReason: string
            artStyle?: string | null
            description: string | null
        }
        setCharacterEditModal({
            characterId: typedCharacter.id,
            characterName: typedCharacter.name,
            appearanceId: typedAppearance.id,
            appearanceIndex: typedAppearance.appearanceIndex,
            changeReason: typedAppearance.changeReason || t('appearanceLabel', { index: typedAppearance.appearanceIndex }),
            artStyle: typedAppearance.artStyle || null,
            description: typedAppearance.description || ''
        })
    }

    // 打开场景编辑弹窗
    const handleOpenLocationEdit = (location: unknown, imageIndex: number) => {
        const typedLocation = location as {
            id: string
            name: string
            summary: string | null
            artStyle: string | null
            images: Array<{ imageIndex: number; description: string | null }>
        }
        const image = typedLocation.images.find(img => img.imageIndex === imageIndex)
        setLocationEditModal({
            locationId: typedLocation.id,
            locationName: typedLocation.name,
            summary: typedLocation.summary || '',
            imageIndex: imageIndex,
            artStyle: typedLocation.artStyle || null,
            description: image?.description || typedLocation.summary || ''
        })
    }

    const handleOpenPropEdit = (prop: unknown, imageIndex: number) => {
        const typedProp = prop as {
            id: string
            name: string
            summary: string | null
            images: Array<{ id: string; imageIndex: number; description: string | null }>
        }
        const variant = typedProp.images.find((image) => image.imageIndex === imageIndex)
        setPropEditModal({
            propId: typedProp.id,
            propName: typedProp.name,
            summary: typedProp.summary || '',
            description: variant?.description || typedProp.summary || '',
            variantId: variant?.id,
        })
    }

    // 角色编辑后触发生成
    const handleCharacterEditGenerate = async (_characterId?: string, _appearanceId?: string) => {
        void _characterId
        void _appearanceId
        if (!characterEditModal) return

        try {
            await characterActions.generate({
                id: characterEditModal.characterId,
                appearanceIndex: characterEditModal.appearanceIndex,
                artStyle: characterEditModal.artStyle || undefined,
                count: characterGenerationCount,
            })
            queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.characters() })
        } catch (error) {
            _ulogError('触发生成失败:', error)
        }
    }

    // 场景编辑后触发生成
    const handleLocationEditGenerate = async (_locationId?: string) => {
        void _locationId
        if (!locationEditModal) return

        try {
            await locationActions.generate({
                id: locationEditModal.locationId,
                artStyle: locationEditModal.artStyle || undefined,
                count: locationGenerationCount,
            })
            queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.locations() })
        } catch (error) {
            _ulogError('触发生成失败:', error)
        }
    }

    // 从音色库选择后绑定到角色
    const handleVoiceSelect = async (voice: { id: string; customVoiceUrl: string | null }) => {
        if (!voicePickerCharacterId) return

        try {
            await characterActions.bindVoice({
                characterId: voicePickerCharacterId,
                globalVoiceId: voice.id,
                customVoiceUrl: voice.customVoiceUrl,
            })
            queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.characters() })
            setVoicePickerCharacterId(null)
        } catch (error) {
            _ulogError('绑定音色失败:', error)
            alert(t('bindVoiceFailed'))
        }
    }

    // 打包下载所有图片资产
    const handleDownloadAll = async () => {
        // 收集所有有效图片
        const imageEntries: Array<{ filename: string; url: string }> = []

        // 角色图片：每个角色每个外貌的当前选中图
        for (const asset of assets) {
            if (asset.kind !== 'character') continue
            for (const variant of asset.variants) {
                const selectedRender = variant.renders.find((render) => render.isSelected) ?? variant.renders[0]
                const url = selectedRender?.imageUrl
                if (!url) continue
                const safeName = asset.name.replace(/[/\\:*?"<>|]/g, '_')
                const filename = variant.index === 0
                    ? `characters/${safeName}.jpg`
                    : `characters/${safeName}_appearance${variant.index}.jpg`
                imageEntries.push({ filename, url })
            }
        }

        // 场景图片：每个场景的选中图
        for (const asset of assets) {
            if (asset.kind !== 'location') continue
            for (const variant of asset.variants) {
                const render = variant.renders[0]
                const url = render?.imageUrl
                if (!url) continue
                const safeName = asset.name.replace(/[/\\:*?"<>|]/g, '_')
                const filename = asset.variants.length <= 1
                    ? `locations/${safeName}.jpg`
                    : `locations/${safeName}_${variant.index + 1}.jpg`
                imageEntries.push({ filename, url })
            }
        }

        for (const asset of assets) {
            if (asset.kind !== 'prop') continue
            for (const variant of asset.variants) {
                const render = variant.renders[0]
                const url = render?.imageUrl
                if (!url) continue
                const safeName = asset.name.replace(/[/\\:*?"<>|]/g, '_')
                const filename = asset.variants.length <= 1
                    ? `props/${safeName}.jpg`
                    : `props/${safeName}_${variant.index + 1}.jpg`
                imageEntries.push({ filename, url })
            }
        }

        if (imageEntries.length === 0) {
            alert(t('downloadEmpty'))
            return
        }

        setIsDownloading(true)
        try {
            const zip = new JSZip()
            // 并发 fetch 所有图片
            await Promise.all(
                imageEntries.map(async ({ filename, url }) => {
                    try {
                        const response = await fetch(url)
                        if (!response.ok) return
                        const blob = await response.blob()
                        zip.file(filename, blob)
                    } catch {
                        // 单张图片失败不阻断整个流程
                    }
                })
            )
            const content = await zip.generateAsync({ type: 'blob' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)
            link.download = `asset-hub_${new Date().toISOString().slice(0, 10)}.zip`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } catch (error) {
            _ulogError('打包下载失败:', error)
            alert(t('downloadFailed'))
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="glass-page min-h-dvh">
            <Navbar />
            <SecondarySidebar
                title={t('title')}
                description={t('description')}
                navAction={(
                    <button
                        type="button"
                        onClick={openNewFolder}
                        className="theater-secondary__nav-action-btn"
                        title={category === 'all' ? t('selectCategoryFirst') : t('newFolder')}
                        aria-label={t('newFolder')}
                    >
                        <AppIcon name="plus" className="h-5 w-5 shrink-0" />
                    </button>
                )}
                items={FIXED_CATEGORIES.map((item) => ({
                    id: item.id,
                    label: t(item.labelKey),
                    icon: item.icon,
                    active: category === item.id,
                    onClick: () => selectCategory(item.id),
                }))}
            />

            <main className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 py-4 sm:px-6">
                <header className="mb-4 border-b border-[var(--glass-stroke-base)] pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            {category !== 'all' && selectedFolderId ? (
                                <nav
                                    className="flex min-w-0 flex-wrap items-center gap-1.5"
                                    aria-label={t('breadcrumb')}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFolderId(null)}
                                        className="font-display text-[length:var(--glass-font-size-h2)] font-medium leading-[var(--glass-line-height-heading)] text-[var(--glass-text-secondary)] transition-colors hover:text-[var(--film-gold-2)]"
                                    >
                                        {t(FIXED_CATEGORIES.find((item) => item.id === category)?.labelKey || 'title')}
                                    </button>
                                    <AppIcon
                                        name="chevronRight"
                                        className="h-4 w-4 shrink-0 text-[var(--glass-text-tertiary)]"
                                    />
                                    <h1 className="min-w-0 truncate font-display text-[length:var(--glass-font-size-h2)] font-medium leading-[var(--glass-line-height-heading)] text-[var(--glass-text-primary)]">
                                        {selectedFolderId === UNCATEGORIZED_FOLDER_ID
                                            ? t('uncategorizedFolder')
                                            : (categoryFolders.find((folder) => folder.id === selectedFolderId)?.name || t('folders'))}
                                    </h1>
                                </nav>
                            ) : (
                                <h1 className="font-display text-[length:var(--glass-font-size-h2)] font-medium leading-[var(--glass-line-height-heading)] text-[var(--glass-text-primary)]">
                                    {category === 'all'
                                        ? t('allAssets')
                                        : t(FIXED_CATEGORIES.find((item) => item.id === category)?.labelKey || 'title')}
                                </h1>
                            )}
                            <p className="mt-2 max-w-3xl text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-text-secondary)]">
                                {category === 'all'
                                    ? t('dashboardHint')
                                    : isFolderBrowser
                                        ? t('folderBrowserHint')
                                        : t('scopeHint')}
                            </p>
                            <p className="mt-2 flex flex-wrap items-center gap-1 text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-text-tertiary)]">
                                <AppIcon name="info" className="h-3.5 w-3.5 shrink-0" />
                                {t('modelHint')}
                                <Link href={{ pathname: '/profile' }} className="text-[var(--film-gold)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--glass-stroke-focus)]">{t('modelHintLink')}</Link>
                                {t('modelHintSuffix')}
                            </p>
                        </div>
                        {category !== 'all' && selectedFolderId ? (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {categoryAddConfig ? (
                                    <button
                                        type="button"
                                        onClick={categoryAddConfig.open}
                                        className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm"
                                    >
                                        <AppIcon name="plus" className="h-4 w-4 shrink-0" />
                                        <span>{categoryAddConfig.label}</span>
                                    </button>
                                ) : null}
                                {category !== 'sfx' ? (
                                    <button
                                        type="button"
                                        onClick={() => { void handleDownloadAll() }}
                                        disabled={isDownloading}
                                        title={t('downloadAllTitle')}
                                        aria-label={t('downloadAll')}
                                        className="glass-btn-base glass-btn-secondary glass-btn-icon glass-btn-icon-md rounded-lg text-[var(--glass-text-primary)] disabled:cursor-not-allowed"
                                    >
                                        <AppIcon
                                            name={isDownloading ? 'refresh' : 'download'}
                                            className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`}
                                        />
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    {folderHint ? (
                        <div className="mt-3 rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-3 py-2 text-[12.5px] text-[var(--glass-text-secondary)]">
                            {t('selectCategoryFirst')}
                        </div>
                    ) : null}
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {category === 'all' ? (
                        <AssetHubDashboard
                            assets={assets}
                            folders={folders}
                            onOpenCategory={(next) => {
                                if (next === 'prop') {
                                    selectCategory('location')
                                    return
                                }
                                selectCategory(next === 'all' ? 'all' : next)
                            }}
                        />
                    ) : isFolderBrowser ? (
                        <AssetFolderGrid
                            folders={folderCards}
                            loading={loading}
                            onOpenFolder={setSelectedFolderId}
                            onCreateFolder={openNewFolder}
                            onEditFolder={(folder) => {
                                setEditingFolder(folder)
                                setShowFolderModal(true)
                            }}
                            onDeleteFolder={(folder) => setFolderPendingDelete(folder)}
                        />
                    ) : (
                        <AssetGrid
                            assets={folderScopedAssets}
                            loading={loading}
                            filter={gridFilter}
                            onAddCharacter={() => setShowAddCharacter(true)}
                            onAddLocation={() => setShowAddLocation(true)}
                            onAddProp={() => setShowAddProp(true)}
                            onAddVoice={() => setShowAddVoice(true)}
                            primaryAddLabel={categoryAddConfig?.label}
                            onPrimaryAdd={categoryAddConfig?.open}
                            onImageClick={setPreviewImage}
                            onImageEdit={handleOpenImageEdit}
                            onVoiceDesign={handleOpenVoiceDesign}
                            onCharacterEdit={handleOpenCharacterEdit}
                            onLocationEdit={handleOpenLocationEdit}
                            onPropEdit={handleOpenPropEdit}
                            onVoiceSelect={(characterId) => setVoicePickerCharacterId(characterId)}
                        />
                    )}
                </div>
            </main>

            {/* 新建角色弹窗 */}
            {showAddCharacter && (
                <CharacterCreationModal
                    mode="asset-hub"
                    folderId={creationFolderId}
                    onClose={() => setShowAddCharacter(false)}
                    onSuccess={() => {
                        setShowAddCharacter(false)
                        queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.characters() })
                        refreshAssets()
                    }}
                />
            )}

            {/* 新建场景弹窗 */}
            {showAddLocation && (
                <LocationCreationModal
                    mode="asset-hub"
                    folderId={creationFolderId}
                    onClose={() => setShowAddLocation(false)}
                    onSuccess={() => {
                        setShowAddLocation(false)
                        queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.locations() })
                        refreshAssets()
                    }}
                />
            )}

            {showAddProp && (
                <PropCreationModal
                    mode="asset-hub"
                    folderId={creationFolderId}
                    onClose={() => setShowAddProp(false)}
                    onSuccess={() => {
                        setShowAddProp(false)
                        refreshAssets()
                    }}
                />
            )}

            {showFolderModal && (
                <FolderModal
                    folder={editingFolder}
                    onClose={() => {
                        setShowFolderModal(false)
                        setEditingFolder(null)
                    }}
                    onSave={(name) => {
                        if (editingFolder) {
                            void handleUpdateFolder(editingFolder.id, name)
                        } else {
                            void handleCreateFolder(name)
                        }
                    }}
                />
            )}

            <ConfirmDialog
                show={!!folderPendingDelete}
                title={t('confirmDeleteFolderTitle')}
                message={t('confirmDeleteFolder')}
                detail={folderPendingDelete?.name}
                confirmText={t('delete')}
                onConfirm={() => {
                    if (folderPendingDelete) void handleDeleteFolder(folderPendingDelete.id)
                }}
                onCancel={() => setFolderPendingDelete(null)}
                type="danger"
            />

            {/* 图片预览弹窗 */}
            {previewImage && (
                <ImagePreviewModal
                    imageUrl={previewImage}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            {/* 图片编辑弹窗 */}
            {imageEditModal && (
                <ImageEditModal
                    type={imageEditModal.type}
                    name={imageEditModal.name}
                    onClose={() => setImageEditModal(null)}
                    onConfirm={handleImageEdit}
                />
            )}

            {/* AI 声音设计对话框 */}
            {voiceDesignCharacter && (
                <VoiceDesignDialog
                    isOpen={!!voiceDesignCharacter}
                    speaker={voiceDesignCharacter.name}
                    hasExistingVoice={voiceDesignCharacter.hasExistingVoice}
                    onClose={() => setVoiceDesignCharacter(null)}
                    onSave={handleVoiceDesignSave}
                />
            )}

            {/* 角色编辑弹窗 */}
            {characterEditModal && (
                <CharacterEditModal
                    mode="asset-hub"
                    characterId={characterEditModal.characterId}
                    characterName={characterEditModal.characterName}
                    appearanceId={characterEditModal.appearanceId}
                    appearanceIndex={characterEditModal.appearanceIndex}
                    changeReason={characterEditModal.changeReason}
                    description={characterEditModal.description}
                    onClose={() => setCharacterEditModal(null)}
                    onSave={handleCharacterEditGenerate}
                />
            )}

            {/* 场景编辑弹窗 */}
            {locationEditModal && (
                <LocationEditModal
                    mode="asset-hub"
                    locationId={locationEditModal.locationId}
                    locationName={locationEditModal.locationName}
                    summary={locationEditModal.summary}
                    imageIndex={locationEditModal.imageIndex}
                    description={locationEditModal.description}
                    onClose={() => setLocationEditModal(null)}
                    onSave={handleLocationEditGenerate}
                />
            )}

            {propEditModal && (
                <PropEditModal
                    mode="asset-hub"
                    propId={propEditModal.propId}
                    propName={propEditModal.propName}
                    summary={propEditModal.summary}
                    description={propEditModal.description}
                    variantId={propEditModal.variantId}
                    onClose={() => setPropEditModal(null)}
                    onRefresh={refreshAssets}
                />
            )}

            {/* 新建音色弹窗 */}
            {showAddVoice && (
                <VoiceCreationModal
                    isOpen={showAddVoice}
                    folderId={creationFolderId}
                    onClose={() => setShowAddVoice(false)}
                    onSuccess={() => {
                        setShowAddVoice(false)
                        queryClient.invalidateQueries({ queryKey: queryKeys.globalAssets.voices() })
                        refreshAssets()
                    }}
                />
            )}

            {/* 从音色库选择弹窗 */}
            {voicePickerCharacterId && (
                <VoicePickerDialog
                    isOpen={!!voicePickerCharacterId}
                    onClose={() => setVoicePickerCharacterId(null)}
                    onSelect={handleVoiceSelect}
                />
            )}
        </div>
    )
}
