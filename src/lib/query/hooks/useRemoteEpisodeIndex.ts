'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import {
  decodeEpisodeIndex,
  type EpisodeIndexItem,
} from '@/lib/projects/episode-index'
import {
  EPISODE_INDEX_WINDOW_SIZE,
  episodeIndexRangeNeedsFetch,
  mergeEpisodeIndexSlots,
} from '@/lib/projects/episode-index-query'
import { normalizeSidebarSearchQuery } from '@/lib/ui/sidebar-search'

interface UseRemoteEpisodeIndexOptions {
  enabled: boolean
  total: number
  focusId?: string | null
}

async function fetchIndexWindow(opts: {
  projectId: string
  offset?: number
  limit: number
  focusId?: string | null
  q?: string
}): Promise<{
  items: EpisodeIndexItem[]
  total: number
  offset: number
  focusIndex?: number
}> {
  const search = new URLSearchParams({ view: 'index', limit: String(opts.limit) })
  if (opts.q) search.set('q', opts.q)
  if (typeof opts.offset === 'number') search.set('offset', String(opts.offset))
  if (opts.focusId) search.set('focusId', opts.focusId)

  const res = await apiFetch(`/api/novel-promotion/${opts.projectId}/episodes?${search}`)
  if (!res.ok) throw new Error(`episode index window failed: ${res.status}`)
  const payload = await res.json()
  return {
    items: decodeEpisodeIndex(payload?.episodes),
    total: Number(payload?.total) || Number(payload?.count) || 0,
    offset: Number(payload?.offset) || 0,
    focusIndex: typeof payload?.focusIndex === 'number' ? payload.focusIndex : undefined,
  }
}

/**
 * Sparse episode index for large projects: fetch DB windows as the sidebar scrolls.
 */
export function useRemoteEpisodeIndex(
  projectId: string | null,
  options: UseRemoteEpisodeIndexOptions,
) {
  const { enabled, total, focusId } = options
  const [slots, setSlots] = useState<Array<EpisodeIndexItem | undefined>>([])
  const [searchHits, setSearchHits] = useState<EpisodeIndexItem[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusIndex, setFocusIndex] = useState(-1)
  const inflight = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !projectId || total <= 0) {
      setSlots([])
      setFocusIndex(-1)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const win = await fetchIndexWindow({
          projectId,
          limit: EPISODE_INDEX_WINDOW_SIZE,
          focusId: focusId || undefined,
          offset: focusId ? undefined : Math.max(0, total - EPISODE_INDEX_WINDOW_SIZE),
        })
        if (cancelled) return
        setSlots(mergeEpisodeIndexSlots(undefined, win.total || total, win.offset, win.items))
        if (typeof win.focusIndex === 'number') {
          setFocusIndex(win.focusIndex)
        } else if (focusId) {
          const idx = win.items.findIndex((row) => row.id === focusId)
          setFocusIndex(idx >= 0 ? win.offset + idx : -1)
        } else {
          setFocusIndex((win.total || total) - 1)
        }
      } catch {
        if (!cancelled) setSlots(Array.from({ length: total }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, projectId, total, focusId])

  const ensureRange = useCallback(
    async (start: number, end: number) => {
      if (!enabled || !projectId || total <= 0) return
      const overscan = 16
      const lo = Math.max(0, start - overscan)
      const hi = Math.min(total - 1, end + overscan)
      if (!episodeIndexRangeNeedsFetch(slots, lo, hi)) return

      const limit = Math.max(EPISODE_INDEX_WINDOW_SIZE, hi - lo + 1)
      const offset = lo
      const key = `${offset}:${limit}`
      if (inflight.current === key) return
      inflight.current = key
      try {
        const win = await fetchIndexWindow({ projectId, offset, limit })
        setSlots((prev) => mergeEpisodeIndexSlots(prev, win.total || total, win.offset, win.items))
      } finally {
        if (inflight.current === key) inflight.current = null
      }
    },
    [enabled, projectId, slots, total],
  )

  useEffect(() => {
    if (!enabled || !projectId) {
      setSearchHits(null)
      return
    }
    const q = normalizeSidebarSearchQuery(searchQuery)
    if (!q) {
      setSearchHits(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const win = await fetchIndexWindow({
            projectId,
            limit: 200,
            offset: 0,
            q,
          })
          if (!cancelled) setSearchHits(win.items)
        } catch {
          if (!cancelled) setSearchHits([])
        }
      })()
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, projectId, searchQuery])

  const invalidate = useCallback(async () => {
    if (!enabled || !projectId || total <= 0) return
    const win = await fetchIndexWindow({
      projectId,
      limit: EPISODE_INDEX_WINDOW_SIZE,
      focusId: focusId || undefined,
      offset: focusId ? undefined : Math.max(0, total - EPISODE_INDEX_WINDOW_SIZE),
    })
    setSlots(mergeEpisodeIndexSlots(undefined, win.total || total, win.offset, win.items))
    setSearchHits(null)
    setSearchQuery('')
  }, [enabled, focusId, projectId, total])

  const activeSourceIndex = useMemo(() => {
    if (searchHits) {
      if (!focusId) return -1
      return searchHits.findIndex((row) => row.id === focusId)
    }
    if (focusId) {
      const found = slots.findIndex((row) => row?.id === focusId)
      if (found >= 0) return found
    }
    return focusIndex
  }, [focusId, focusIndex, searchHits, slots])

  return {
    slots,
    searchHits,
    searchQuery,
    setSearchQuery,
    ensureRange,
    invalidate,
    activeSourceIndex,
    isSearchMode: !!normalizeSidebarSearchQuery(searchQuery),
  }
}
