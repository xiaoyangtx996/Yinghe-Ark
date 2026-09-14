'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

type StepStatus = 'empty' | 'active' | 'processing' | 'ready'

interface NavItemData {
    id: string
    icon: string
    label: string
    status: StepStatus
    href?: string  // 可选的链接地址
    disabled?: boolean  // 是否禁用（开发中）
    disabledLabel?: string  // 禁用时显示的提示文字
}

interface CapsuleNavProps {
    items: NavItemData[]
    activeId: string
    onItemClick: (id: string) => void
    projectId?: string  // 用于构建链接
    episodeId?: string  // 用于构建链接
    /** inline | fixed | rail (vertical stage list beside content) */
    placement?: 'inline' | 'fixed' | 'rail'
}

/**
 * NavItem - 胶囊导航单项
 * 支持左键点击切换、中键/Ctrl+点击在新标签页打开
 */
function NavItem({
    active,
    onClick,
    label,
    status,
    href,
    disabled,
    disabledLabel,
    index,
    orientation = 'horizontal',
}: {
    active: boolean
    onClick: () => void
    label: string
    status: StepStatus
    href?: string
    disabled?: boolean
    disabledLabel?: string
    index: number
    orientation?: 'horizontal' | 'vertical'
}) {
    const handleClick = (e: React.MouseEvent) => {
        if (disabled) return
        if (e.button === 1 || e.ctrlKey || e.metaKey) {
            if (href) {
                window.open(href, '_blank')
            }
            return
        }
        onClick()
    }

    const handleAuxClick = (e: React.MouseEvent) => {
        if (disabled) return
        if (e.button === 1 && href) {
            e.preventDefault()
            window.open(href, '_blank')
        }
    }

    return (
        <div className={`relative group flex-shrink-0 ${orientation === 'vertical' ? 'w-full min-w-0' : 'min-w-[5.5rem]'}`}>
            <button
                onClick={handleClick}
                onAuxClick={handleAuxClick}
                disabled={disabled}
                data-active={active ? 'true' : 'false'}
                className="film-stages__item w-full"
            >
                <span className="film-stages__n">
                    {String(index + 1).padStart(2, '0')}
                    {status === 'ready' && !disabled ? ' · ✓' : ''}
                    {status === 'processing' && !disabled ? ' · …' : ''}
                </span>
                <span className={`film-stages__t ${disabled ? 'opacity-70' : ''}`}>{label}</span>
            </button>
            {disabled && disabledLabel && (
                <div className={`absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${orientation === 'vertical' ? 'left-full top-1/2 ml-2 -translate-y-1/2' : 'left-1/2 top-full mt-2 -translate-x-1/2'}`}>
                    <div className="glass-surface-soft text-[length:var(--glass-font-size-caption)] px-3 py-2 whitespace-nowrap text-[var(--glass-text-primary)]">
                        {disabledLabel}
                    </div>
                </div>
            )}
        </div>
    )
}


/**
 * CapsuleNav - 阶段导航（默认文档流；rail=左侧竖排；fixed=旧悬浮）
 * 支持中键和Ctrl+点击在新标签页打开
 */
export function CapsuleNav({
    items,
    activeId,
    onItemClick,
    projectId,
    episodeId,
    placement = 'inline',
}: CapsuleNavProps) {
    // 构建每个导航项的链接地址
    const buildHref = (stageId: string): string | undefined => {
        if (!projectId) return undefined
        const params = new URLSearchParams()
        params.set('stage', stageId)
        if (episodeId) {
            params.set('episode', episodeId)
        }
        return `/workspace/${projectId}?${params.toString()}`
    }

    const isRail = placement === 'rail'
    const isFixed = placement === 'fixed'

    const navClass = isFixed
        ? 'fixed top-[4.75rem] left-1/2 z-40 w-[min(860px,calc(100vw-2rem))] -translate-x-1/2 animate-fadeInDown max-[900px]:left-[calc(var(--app-rail-width)+0.75rem)] max-[900px]:right-3 max-[900px]:w-auto max-[900px]:translate-x-0 max-[900px]:top-[7.25rem]'
        : 'relative z-10 w-full min-w-0'

    const stagesClass = [
        'film-stages w-full',
        isRail ? 'film-stages--rail max-w-none' : '',
        placement === 'inline' ? 'max-w-none' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <nav className={navClass} data-placement={placement}>
            <div className={stagesClass}>
                {items.map((item, index) => (
                    <NavItem
                        key={item.id}
                        active={activeId === item.id}
                        onClick={() => onItemClick(item.id)}
                        label={item.label}
                        status={item.status}
                        href={buildHref(item.id)}
                        disabled={item.disabled}
                        disabledLabel={item.disabledLabel}
                        index={index}
                        orientation={isRail ? 'vertical' : 'horizontal'}
                    />
                ))}
            </div>
        </nav>
    )
}

/**
 * EpisodeSelector - 剧集选择器
 */
interface Episode {
    id: string
    title: string
    summary?: string
    status?: {
        story?: StepStatus
        script?: StepStatus
        visual?: StepStatus
    }
}

interface EpisodeSelectorProps {
    episodes: Episode[]
    currentId: string
    onSelect: (id: string) => void
    onAdd?: () => void
    onRename?: (id: string, newName: string) => void
    onDelete?: (id: string) => void
    projectName?: string  // 项目名称，显示在左上角
    /** inline = document flow (default); fixed = legacy floating overlay */
    placement?: 'inline' | 'fixed'
}

export function EpisodeSelector({
    episodes,
    currentId,
    onSelect,
    onAdd,
    onRename,
    onDelete,
    projectName,
    placement = 'inline',
}: EpisodeSelectorProps) {
    const t = useTranslations('common')
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const currentEp = episodes.find(e => e.id === currentId) || episodes[0]
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!currentEp) return null

    const rootClass =
        placement === 'fixed'
            ? 'fixed top-[4.75rem] left-[calc(var(--app-rail-width)+1.5rem)] z-40'
            : 'relative z-10 shrink-0'

    return (
        <div className={rootClass} data-placement={placement} ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="glass-btn-base glass-btn-secondary flex items-center gap-3 px-3.5 py-2 transition-all group rounded-[12px] min-h-[2.75rem]"
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--film-gold)_16%,transparent)] text-[12px] font-semibold tracking-[0.04em] text-[var(--film-gold)]">
                    {t('episode')}
                </div>
                <div className="flex flex-col items-start text-left mr-0.5 gap-0">
                    <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--glass-text-primary)] line-clamp-1 max-w-[200px]">
                        {projectName || t('project')}
                    </span>
                    <span className="text-[12px] leading-snug text-[var(--glass-text-secondary)] line-clamp-1 max-w-[200px]">
                        {currentEp.title}
                    </span>
                </div>
                <AppIcon name="chevronDown" className={`w-4 h-4 text-[var(--glass-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="glass-surface-modal absolute left-0 top-full mt-2 w-80 origin-top-left p-2 animate-fadeIn rounded-[16px]">
                    <div className="max-h-[360px] overflow-y-auto app-scrollbar space-y-0.5">
                        {episodes.map(ep => {
                            const statusColor = ep.status?.visual === 'ready'
                                ? 'bg-[var(--glass-tone-success-fg)]'
                                : ep.status?.script === 'ready'
                                    ? 'bg-[var(--glass-accent-from)]'
                                    : 'bg-[var(--glass-stroke-strong)]'

                            // 编辑模式
                            if (editingId === ep.id) {
                                return (
                                    <div key={ep.id} className="flex items-center gap-2 p-3 rounded-[var(--glass-radius-panel)] bg-[var(--glass-tone-info-bg)] border border-[var(--glass-stroke-focus)]">
                                        <div className={`w-2 h-10 rounded-full ${statusColor}`} />
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && editingName.trim()) {
                                                    onRename?.(ep.id, editingName.trim())
                                                    setEditingId(null)
                                                } else if (e.key === 'Escape') {
                                                    setEditingId(null)
                                                }
                                            }}
                                            className="flex-1 px-2 py-1 text-[length:var(--glass-font-size-body)] border border-[var(--glass-stroke-focus)] rounded-[var(--glass-radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--glass-focus-ring-strong)]"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                if (editingName.trim()) {
                                                    onRename?.(ep.id, editingName.trim())
                                                }
                                                setEditingId(null)
                                            }}
                                            className="w-7 h-7 rounded-lg bg-[var(--glass-accent-from)] text-[var(--glass-text-on-accent)] hover:bg-[var(--glass-accent-to)] flex items-center justify-center"
                                        >
                                            <AppIcon name="check" className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="w-7 h-7 rounded-lg bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-surface-strong)] flex items-center justify-center"
                                        >
                                            <AppIcon name="close" className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            }

                            // 删除确认模式
                            if (deletingId === ep.id) {
                                return (
                                    <div key={ep.id} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--glass-tone-danger-bg)] border border-[var(--glass-tone-danger-fg)]/30">
                                        <div className="flex-1 text-sm font-medium text-[var(--glass-tone-danger-fg)] truncate">
                                            {t('deleteEpisode')}：{ep.title}
                                        </div>
                                        <button
                                            onClick={() => {
                                                onDelete?.(ep.id)
                                                setDeletingId(null)
                                                setIsOpen(false)
                                            }}
                                            className="px-2 py-1 rounded-lg bg-[var(--glass-tone-danger-fg)] text-[var(--glass-text-on-accent)] text-xs font-medium hover:opacity-90 transition-opacity"
                                        >
                                            {t('deleteEpisodeConfirm')}
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(null)}
                                            className="w-7 h-7 rounded-lg bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-surface-strong)] flex items-center justify-center"
                                        >
                                            <AppIcon name="close" className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={ep.id}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${ep.id === currentId
                                        ? 'bg-[var(--glass-tone-info-bg)] border border-[var(--glass-stroke-focus)]'
                                        : 'hover:bg-[var(--glass-bg-muted)] border border-transparent'
                                        }`}
                                >
                                    <button
                                        onClick={() => { onSelect(ep.id); setIsOpen(false); }}
                                        className="flex-1 flex items-center gap-3 text-left"
                                    >
                                        <div className={`w-2 h-10 rounded-full ${statusColor}`} />
                                        <div className="flex-1">
                                            <div className="font-medium text-[var(--glass-text-primary)] text-sm truncate">{ep.title}</div>
                                            {ep.summary && (
                                                <div className="text-xs text-[var(--glass-text-tertiary)] truncate">{ep.summary}</div>
                                            )}
                                        </div>
                                        {ep.id === currentId && (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]">
                                                <AppIcon name="checkDot" className="h-2.5 w-2.5" />
                                            </span>
                                        )}
                                    </button>
                                    {onRename && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingId(ep.id)
                                                setEditingName(ep.title)
                                            }}
                                            className="w-7 h-7 rounded-lg hover:bg-[var(--glass-bg-surface-strong)] flex items-center justify-center text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)] transition-colors"
                                            title={t('editEpisodeName')}
                                        >
                                            <AppIcon name="edit" className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeletingId(ep.id)
                                            }}
                                            className="w-7 h-7 rounded-lg hover:bg-[var(--glass-tone-danger-bg)] flex items-center justify-center text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-danger-fg)] transition-colors"
                                            title={t('deleteEpisode')}
                                        >
                                            <AppIcon name="trash" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {onAdd && (
                        <>
                            <div className="h-px bg-[var(--glass-bg-muted)] my-2 mx-2" />
                            <button
                                onClick={() => { onAdd(); setIsOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)] font-medium text-sm transition-colors"
                            >
                                <span className="text-lg">+</span> {t('newEpisode')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default CapsuleNav
