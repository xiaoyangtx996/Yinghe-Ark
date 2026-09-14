import { matchesSidebarSearch } from '@/lib/ui/sidebar-search'
import type { EpisodeIndexItem } from '@/lib/projects/episode-index'

export interface EpisodeIndexQuery {
  q: string
  offset: number
  /** null = no slice (return all filtered rows) */
  limit: number | null
  /** When set with limit and no q, center the DB window on this episode id. */
  focusId: string | null
}

const MAX_LIMIT = 5000

/** Client switches from full compact → remote windows at this episodeCount. */
export const EPISODE_INDEX_REMOTE_THRESHOLD = 400

/** Default take size for remote sidebar windows. */
export const EPISODE_INDEX_WINDOW_SIZE = 80

/**
 * Parse index list query params. Invalid numbers fall back safely.
 * Missing `limit` means "all matching rows".
 */
export function parseEpisodeIndexQuery(input: {
  q?: string | null
  offset?: string | null
  limit?: string | null
  focusId?: string | null
}): EpisodeIndexQuery {
  const q = typeof input.q === 'string' ? input.q.trim() : ''
  const focusId =
    typeof input.focusId === 'string' && input.focusId.trim()
      ? input.focusId.trim()
      : null
  const offsetParsed = Number.parseInt(input.offset || '0', 10)
  const offset = Number.isFinite(offsetParsed) && offsetParsed > 0 ? offsetParsed : 0

  if (input.limit == null || input.limit === '') {
    return { q, offset, limit: null, focusId }
  }
  const limitParsed = Number.parseInt(input.limit, 10)
  if (!Number.isFinite(limitParsed) || limitParsed <= 0) {
    return { q, offset, limit: null, focusId }
  }
  return { q, offset, limit: Math.min(MAX_LIMIT, limitParsed), focusId }
}

/**
 * Center a fixed-size window on `rank` (0-based index in ordered list).
 */
export function resolveFocusWindowOffset(rank: number, limit: number, total: number): number {
  if (limit <= 0 || total <= 0) return 0
  const safeRank = Math.max(0, Math.min(rank, total - 1))
  const ideal = safeRank - Math.floor(limit / 2)
  const maxOffset = Math.max(0, total - limit)
  return Math.max(0, Math.min(ideal, maxOffset))
}

export interface EpisodeIndexQueryResult {
  items: EpisodeIndexItem[]
  /** Rows matching `q` before offset/limit (or total when no q). */
  count: number
}

/** Filter by sidebar search semantics, then apply offset/limit. */
export function applyEpisodeIndexQuery(
  items: ReadonlyArray<EpisodeIndexItem>,
  query: EpisodeIndexQuery,
): EpisodeIndexQueryResult {
  const filtered = query.q
    ? items.filter((item) => matchesSidebarSearch(item.name, query.q))
    : [...items]
  const count = filtered.length
  const sliced =
    query.limit == null
      ? filtered.slice(query.offset)
      : filtered.slice(query.offset, query.offset + query.limit)
  return { items: sliced, count }
}

/** Merge a fetched window into a sparse slot array sized to `total`. */
export function mergeEpisodeIndexSlots(
  previous: ReadonlyArray<EpisodeIndexItem | undefined> | undefined,
  total: number,
  offset: number,
  items: ReadonlyArray<EpisodeIndexItem>,
): Array<EpisodeIndexItem | undefined> {
  const next =
    previous && previous.length === total
      ? previous.slice()
      : Array.from<EpisodeIndexItem | undefined>({ length: Math.max(0, total) })
  for (let i = 0; i < items.length; i++) {
    const at = offset + i
    if (at >= 0 && at < next.length) next[at] = items[i]
  }
  return next
}

/** Whether a [start,end] inclusive range still has missing slots. */
export function episodeIndexRangeNeedsFetch(
  slots: ReadonlyArray<EpisodeIndexItem | undefined> | undefined,
  start: number,
  end: number,
): boolean {
  if (!slots || slots.length === 0) return true
  const lo = Math.max(0, start)
  const hi = Math.min(slots.length - 1, end)
  if (hi < lo) return false
  for (let i = lo; i <= hi; i++) {
    if (!slots[i]) return true
  }
  return false
}
