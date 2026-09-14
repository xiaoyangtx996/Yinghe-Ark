'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent,
} from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon, type AppIconName } from '@/components/ui/icons'
import { computeScrollThumbMetrics, scrollTopFromThumbOffset, scrollTopFromTrackClick } from '@/lib/ui/hover-scrollbar'
import { matchesSidebarSearch, normalizeSidebarSearchQuery } from '@/lib/ui/sidebar-search'
import {
  SECONDARY_SIDEBAR_ROW_STRIDE_PX,
  computeVirtualWindow,
  scrollTopToRevealIndex,
  shouldVirtualizeList,
} from '@/lib/ui/virtual-list'

export interface SecondaryMenuItem {
  id: string
  label: string
  icon?: AppIconName
  active?: boolean
  onClick?: () => void
  trailing?: ReactNode
}

/** Long-list source: materialize only the rows the sidebar needs to paint/search. */
export interface SecondaryListSource {
  count: number
  getItem: (index: number) => SecondaryMenuItem
  /** Return indices into the source for the current search query (empty query → all). */
  searchIndices?: (query: string) => number[]
  /** Source index of the active row (-1 if none). Avoids scanning getItem for active. */
  activeSourceIndex?: number
}

interface SecondarySidebarProps {
  title: string
  description?: string
  headerAction?: ReactNode
  /** Action below the scroll pane (e.g. “+”), always visible. */
  navAction?: ReactNode
  /** Short lists (Asset Hub). Prefer `listSource` for 1000+ episode indexes. */
  items?: SecondaryMenuItem[]
  listSource?: SecondaryListSource
  /**
   * Prefer this for long lists: trailing is built only for visible rows.
   * Falls back to `item.trailing` when omitted.
   */
  renderTrailing?: (item: SecondaryMenuItem) => ReactNode
  /** Fixed search field under the header (episode jump / filter). */
  searchable?: boolean
  /** Notify parent when the search box changes (remote index / server q). */
  onSearchQueryChange?: (query: string) => void
  /** Notify parent of absolute source indices currently needed for paint. */
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void
  searchPlaceholder?: string
  searchEmptyHint?: string
  emptyHint?: string
  footer?: ReactNode
}

function SecondaryNavRow({
  item,
  trailing,
  onActivate,
}: {
  item: SecondaryMenuItem
  trailing: ReactNode
  onActivate: () => void
}) {
  return (
    <div
      className="theater-secondary__item-row"
      data-active={item.active ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={onActivate}
        className="theater-secondary__item"
        data-active={item.active ? 'true' : 'false'}
        aria-current={item.active ? 'page' : undefined}
      >
        {item.icon ? <AppIcon name={item.icon} className="h-4 w-4 shrink-0" /> : null}
        <span className="truncate">{item.label}</span>
      </button>
      {trailing ? (
        <div className="theater-secondary__trailing">{trailing}</div>
      ) : null}
    </div>
  )
}

export const SecondarySidebar = memo(function SecondarySidebar({
  title,
  description,
  headerAction,
  navAction,
  items,
  listSource,
  renderTrailing,
  searchable = false,
  onSearchQueryChange,
  onVisibleRangeChange,
  searchPlaceholder,
  searchEmptyHint,
  emptyHint,
  footer,
}: SecondarySidebarProps) {
  const t = useTranslations('common')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [thumb, setThumb] = useState({ needed: false, top: 0, height: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const sourceCount = listSource?.count ?? items?.length ?? 0

  const visibleIndices = useMemo(() => {
    if (listSource) {
      if (!searchable || !normalizeSidebarSearchQuery(searchQuery)) {
        return Array.from({ length: listSource.count }, (_, i) => i)
      }
      if (listSource.searchIndices) return listSource.searchIndices(searchQuery)
      const matched: number[] = []
      for (let i = 0; i < listSource.count; i++) {
        const item = listSource.getItem(i)
        if (matchesSidebarSearch(item.label, searchQuery)) matched.push(i)
      }
      return matched
    }
    const list = items || []
    if (!searchable || !normalizeSidebarSearchQuery(searchQuery)) {
      return list.map((_, i) => i)
    }
    const matched: number[] = []
    for (let i = 0; i < list.length; i++) {
      if (matchesSidebarSearch(list[i]!.label, searchQuery)) matched.push(i)
    }
    return matched
  }, [items, listSource, searchable, searchQuery])

  const resolveItem = useCallback(
    (sourceIndex: number): SecondaryMenuItem | null => {
      if (listSource) return listSource.getItem(sourceIndex)
      return items?.[sourceIndex] ?? null
    },
    [items, listSource],
  )

  const virtualized = shouldVirtualizeList(visibleIndices.length)
  const activeIndex = useMemo(() => {
    if (listSource && typeof listSource.activeSourceIndex === 'number') {
      if (listSource.activeSourceIndex < 0) return -1
      return visibleIndices.indexOf(listSource.activeSourceIndex)
    }
    for (let i = 0; i < visibleIndices.length; i++) {
      const item = resolveItem(visibleIndices[i]!)
      if (item?.active) return i
    }
    return -1
  }, [visibleIndices, resolveItem, listSource])

  const activeItemId = useMemo(() => {
    if (listSource && typeof listSource.activeSourceIndex === 'number' && listSource.activeSourceIndex >= 0) {
      return listSource.getItem(listSource.activeSourceIndex).id
    }
    return items?.find((item) => item.active)?.id
  }, [items, listSource])

  const syncThumb = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setThumb(
      computeScrollThumbMetrics({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }),
    )
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [activeItemId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const syncViewport = () => {
      setViewportHeight(el.clientHeight)
      syncThumb()
    }
    syncViewport()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncViewport) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [virtualized, visibleIndices.length, syncThumb])

  useEffect(() => {
    if (!virtualized) {
      syncThumb()
      return
    }
    const el = scrollRef.current
    if (!el || activeIndex < 0) {
      syncThumb()
      return
    }
    const next = scrollTopToRevealIndex({
      index: activeIndex,
      itemSize: SECONDARY_SIDEBAR_ROW_STRIDE_PX,
      viewportHeight: el.clientHeight,
      scrollTop: el.scrollTop,
      itemCount: visibleIndices.length,
    })
    if (next !== el.scrollTop) {
      el.scrollTop = next
      setScrollTop(next)
    }
    syncThumb()
  }, [activeIndex, virtualized, visibleIndices.length, viewportHeight, syncThumb])

  useEffect(() => {
    if (!normalizeSidebarSearchQuery(searchQuery)) return
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = 0
    setScrollTop(0)
    syncThumb()
  }, [searchQuery, syncThumb])

  // Must not be named `window` — that shadows the browser global and breaks addEventListener.
  const virtualWindow = useMemo(
    () =>
      computeVirtualWindow({
        scrollTop,
        viewportHeight: viewportHeight || 480,
        itemCount: visibleIndices.length,
        itemSize: SECONDARY_SIDEBAR_ROW_STRIDE_PX,
      }),
    [scrollTop, viewportHeight, visibleIndices.length],
  )

  useEffect(() => {
    onSearchQueryChange?.(searchQuery)
  }, [searchQuery, onSearchQueryChange])

  useEffect(() => {
    syncThumb()
  }, [virtualWindow.totalHeight, syncThumb])

  useEffect(() => {
    if (!onVisibleRangeChange || visibleIndices.length === 0) return
    if (!virtualized) {
      onVisibleRangeChange(visibleIndices[0]!, visibleIndices[visibleIndices.length - 1]!)
      return
    }
    const start = visibleIndices[virtualWindow.startIndex]
    const end = visibleIndices[Math.min(virtualWindow.endIndex, visibleIndices.length - 1)]
    if (typeof start === 'number' && typeof end === 'number') {
      onVisibleRangeChange(start, end)
    }
  }, [
    onVisibleRangeChange,
    virtualWindow.startIndex,
    virtualWindow.endIndex,
    virtualized,
    visibleIndices,
  ])

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    setScrollTop(el.scrollTop)
    setThumb(
      computeScrollThumbMetrics({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }),
    )
  }, [])

  const applyScrollTop = useCallback((next: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = next
    setScrollTop(next)
    setThumb(
      computeScrollThumbMetrics({
        scrollTop: next,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }),
    )
  }, [])

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const el = scrollRef.current
      const track = event.currentTarget
      if (!el || !thumb.needed) return

      const rect = track.getBoundingClientRect()
      const clickY = event.clientY - rect.top
      const isOnThumb = clickY >= thumb.top && clickY <= thumb.top + thumb.height

      event.preventDefault()
      event.stopPropagation()
      track.setPointerCapture(event.pointerId)

      const dragOffset = isOnThumb ? clickY - thumb.top : thumb.height / 2
      if (!isOnThumb) {
        applyScrollTop(
          scrollTopFromTrackClick({
            clickY,
            thumbHeight: thumb.height,
            trackHeight: rect.height,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
          }),
        )
      }

      const onMove = (moveEvent: PointerEvent) => {
        const scrollEl = scrollRef.current
        if (!scrollEl) return
        const trackRect = track.getBoundingClientRect()
        const y = moveEvent.clientY - trackRect.top - dragOffset
        applyScrollTop(
          scrollTopFromThumbOffset({
            thumbTop: y,
            thumbHeight: thumb.height,
            trackHeight: trackRect.height,
            scrollHeight: scrollEl.scrollHeight,
            clientHeight: scrollEl.clientHeight,
          }),
        )
      }

      const onUp = (upEvent: PointerEvent) => {
        track.releasePointerCapture(upEvent.pointerId)
        track.removeEventListener('pointermove', onMove)
        track.removeEventListener('pointerup', onUp)
        track.removeEventListener('pointercancel', onUp)
      }

      track.addEventListener('pointermove', onMove)
      track.addEventListener('pointerup', onUp)
      track.addEventListener('pointercancel', onUp)
    },
    [applyScrollTop, thumb.height, thumb.needed, thumb.top],
  )

  const resolveTrailing = (item: SecondaryMenuItem) =>
    renderTrailing ? renderTrailing(item) : item.trailing

  const activateItem = (item: SecondaryMenuItem) => {
    item.onClick?.()
    setSearchQuery('')
    setMobileOpen(false)
  }

  const renderRows = () => {
    if (sourceCount === 0 && emptyHint) {
      return (
        <p className="px-3 py-6 text-center text-xs text-[var(--glass-text-secondary)]">
          {emptyHint}
        </p>
      )
    }

    if (visibleIndices.length === 0 && searchQuery.trim()) {
      return (
        <p className="px-3 py-6 text-center text-xs text-[var(--glass-text-secondary)]">
          {searchEmptyHint || emptyHint || '—'}
        </p>
      )
    }

    const paintIndices = virtualized
      ? visibleIndices.slice(virtualWindow.startIndex, virtualWindow.endIndex + 1)
      : visibleIndices

    const rows = paintIndices.map((sourceIndex) => {
      const item = resolveItem(sourceIndex)
      if (!item) return null
      return (
        <div
          key={item.id}
          style={
            virtualized
              ? {
                  height: SECONDARY_SIDEBAR_ROW_STRIDE_PX,
                  boxSizing: 'border-box',
                  paddingBottom: 4,
                }
              : undefined
          }
        >
          <SecondaryNavRow
            item={item}
            trailing={resolveTrailing(item)}
            onActivate={() => activateItem(item)}
          />
        </div>
      )
    })

    if (!virtualized) return rows

    return (
      <div
        className="theater-secondary__nav-items theater-secondary__nav-items--virtual"
        data-virtualized="true"
        style={{ height: virtualWindow.totalHeight, position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            top: virtualWindow.offsetY,
            left: 0,
            right: 0,
          }}
        >
          {rows}
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className="theater-secondary-toggle"
        aria-expanded={mobileOpen}
        aria-controls="theater-secondary-panel"
        onClick={() => setMobileOpen(true)}
      >
        <AppIcon name="menu" className="h-3.5 w-3.5" />
        {title}
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="theater-secondary-backdrop"
          aria-label={t('closeMenu')}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="theater-secondary-panel"
        className="theater-secondary"
        data-theater-secondary
        data-open={mobileOpen ? 'true' : 'false'}
        aria-label={title}
      >
        <div className="theater-secondary__header">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="theater-secondary__title truncate">{title}</h2>
              {description ? (
                <p className="theater-secondary__desc">{description}</p>
              ) : null}
            </div>
            {headerAction ? (
              <div className="relative z-10 shrink-0">{headerAction}</div>
            ) : null}
          </div>

          {searchable ? (
            <div className="theater-secondary__search">
              <AppIcon name="search" className="theater-secondary__search-icon" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="theater-secondary__search-input"
                aria-label={searchPlaceholder || t('search')}
                autoComplete="off"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="theater-secondary__search-clear"
                  aria-label={t('clear')}
                  onClick={() => setSearchQuery('')}
                >
                  <AppIcon name="close" className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <nav className="theater-secondary__nav" aria-label={`${title} navigation`}>
          <div className="theater-secondary__nav-scroll-wrap">
            <div
              ref={scrollRef}
              id="theater-secondary-scroll"
              className="theater-secondary__nav-scroll"
              onScroll={handleScroll}
            >
              {virtualized ? (
                renderRows()
              ) : (
                <div className="theater-secondary__nav-items">{renderRows()}</div>
              )}
            </div>
            {thumb.needed ? (
              <div
                className="theater-secondary__scrollbar"
                role="scrollbar"
                aria-controls="theater-secondary-scroll"
                aria-valuenow={Math.round(scrollTop)}
                aria-orientation="vertical"
                onPointerDown={handleTrackPointerDown}
              >
                <div
                  className="theater-secondary__scrollbar-thumb"
                  style={{ transform: `translateY(${thumb.top}px)`, height: thumb.height }}
                />
              </div>
            ) : null}
          </div>
          {navAction ? (
            <div className="theater-secondary__nav-action">{navAction}</div>
          ) : null}
        </nav>

        {footer ? <div className="theater-secondary__footer">{footer}</div> : null}
      </aside>
    </>
  )
})
