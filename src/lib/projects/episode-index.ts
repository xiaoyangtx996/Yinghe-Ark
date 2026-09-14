import { matchesSidebarSearch } from '@/lib/ui/sidebar-search'

export type EpisodeIndexItem = {
  id: string
  episodeNumber: number
  name: string
}

/** Columnar wire format v1 — avoids repeating JSON keys thousands of times. */
export type CompactEpisodeIndexV1 = {
  v: 1
  id: string[]
  n: number[]
  name: string[]
}

/**
 * Columnar wire format v2:
 * - id: UUID as base64url (16 bytes → 22 chars, no dashes)
 * - n: delta-encoded episode numbers
 * - t: title suffix for `第 {n} 集：{t}` (empty → `第 {n} 集`)
 * - x: rare full-name overrides keyed by index string
 */
export type CompactEpisodeIndexV2 = {
  v: 2
  id: string[]
  n: number[]
  t: string[]
  x?: Record<string, string>
}

export type CompactEpisodeIndex = CompactEpisodeIndexV1 | CompactEpisodeIndexV2

function bytesToBase64Url(bytes: Uint8Array): string {
  // Prefer standard base64 then rewrite — Next client Buffer polyfill lacks 'base64url'.
  let b64: string
  if (typeof Buffer !== 'undefined') {
    b64 = Buffer.from(bytes).toString('base64')
  } else {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
    b64 = btoa(bin)
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  const b64 = padded + '='.repeat(padLen)
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function uuidToBase64Url(uuid: string): string {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== 32 || /[^0-9a-fA-F]/.test(hex)) {
    // Non-UUID ids (tests / legacy): pass through with a marker prefix
    return `:${uuid}`
  }
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytesToBase64Url(bytes)
}

function base64UrlToUuid(value: string): string {
  if (value.startsWith(':')) return value.slice(1)
  const bytes = base64UrlToBytes(value)
  if (bytes.length !== 16) return value
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function encodeEpisodeNumbersDelta(numbers: number[]): number[] {
  if (numbers.length === 0) return []
  const out = new Array<number>(numbers.length)
  out[0] = numbers[0] ?? 0
  for (let i = 1; i < numbers.length; i++) {
    out[i] = (numbers[i] ?? 0) - (numbers[i - 1] ?? 0)
  }
  return out
}

function decodeEpisodeNumbersDelta(deltas: number[]): number[] {
  if (deltas.length === 0) return []
  const out = new Array<number>(deltas.length)
  out[0] = deltas[0] ?? 0
  for (let i = 1; i < deltas.length; i++) {
    out[i] = (out[i - 1] ?? 0) + (deltas[i] ?? 0)
  }
  return out
}

const compactNumbersCache = new WeakMap<object, number[]>()

function getCompactEpisodeNumbers(compact: CompactEpisodeIndex): number[] {
  const cached = compactNumbersCache.get(compact)
  if (cached) return cached
  const numbers =
    compact.v === 2
      ? decodeEpisodeNumbersDelta(compact.n)
      : compact.n.map((value) => Number(value) || 0)
  compactNumbersCache.set(compact, numbers)
  return numbers
}

/** Accept wire/API payload; return compact columnar or null. */
export function parseCompactEpisodeIndex(raw: unknown): CompactEpisodeIndex | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const compact = raw as Partial<CompactEpisodeIndexV1> | Partial<CompactEpisodeIndexV2>
  if (compact.v === 2 && Array.isArray(compact.id) && Array.isArray(compact.n) && Array.isArray(compact.t)) {
    return compact as CompactEpisodeIndexV2
  }
  if (compact.v === 1 && Array.isArray(compact.id) && Array.isArray(compact.n) && Array.isArray(compact.name)) {
    return compact as CompactEpisodeIndexV1
  }
  return null
}

export function getCompactEpisodeIndexLength(compact: CompactEpisodeIndex | null | undefined): number {
  if (!compact || !Array.isArray(compact.id)) return 0
  return compact.id.length
}

export function decodeCompactEpisodeAt(
  compact: CompactEpisodeIndex,
  index: number,
): EpisodeIndexItem | null {
  const length = getCompactEpisodeIndexLength(compact)
  if (index < 0 || index >= length) return null
  const numbers = getCompactEpisodeNumbers(compact)
  const episodeNumber = numbers[index] ?? 0
  if (compact.v === 2) {
    const full = compact.x?.[String(index)]
    return {
      id: base64UrlToUuid(String(compact.id[index] ?? '')),
      episodeNumber,
      name: joinIndexedName(
        episodeNumber,
        typeof compact.t[index] === 'string' ? compact.t[index]! : '',
        full,
      ),
    }
  }
  return {
    id: String(compact.id[index] ?? ''),
    episodeNumber,
    name: typeof compact.name[index] === 'string' ? compact.name[index]! : '',
  }
}

export function decodeCompactEpisodeRange(
  compact: CompactEpisodeIndex,
  startIndex: number,
  endIndexInclusive: number,
): EpisodeIndexItem[] {
  const length = getCompactEpisodeIndexLength(compact)
  if (length <= 0) return []
  const start = Math.max(0, startIndex)
  const end = Math.min(length - 1, endIndexInclusive)
  if (end < start) return []
  const out: EpisodeIndexItem[] = []
  for (let i = start; i <= end; i++) {
    const row = decodeCompactEpisodeAt(compact, i)
    if (row) out.push(row)
  }
  return out
}

export function findCompactEpisodeIndexById(
  compact: CompactEpisodeIndex,
  episodeId: string,
): number {
  const length = getCompactEpisodeIndexLength(compact)
  if (compact.v === 2) {
    const encoded = uuidToBase64Url(episodeId)
    for (let i = 0; i < length; i++) {
      if (compact.id[i] === encoded) return i
    }
    return -1
  }
  for (let i = 0; i < length; i++) {
    if (String(compact.id[i] ?? '') === episodeId) return i
  }
  return -1
}

/** Highest episodeNumber wins; ties → last index. */
export function resolveLatestCompactEpisodeId(compact: CompactEpisodeIndex): string | null {
  const length = getCompactEpisodeIndexLength(compact)
  if (length <= 0) return null
  const numbers = getCompactEpisodeNumbers(compact)
  let bestIndex = length - 1
  let bestNumber = numbers[bestIndex] ?? 0
  for (let i = 0; i < length; i++) {
    const n = numbers[i] ?? 0
    if (n >= bestNumber) {
      bestNumber = n
      bestIndex = i
    }
  }
  return decodeCompactEpisodeAt(compact, bestIndex)?.id ?? null
}

export function filterCompactEpisodeIndexIndices(
  compact: CompactEpisodeIndex,
  query: string,
): number[] {
  const length = getCompactEpisodeIndexLength(compact)
  if (!query.trim()) {
    return Array.from({ length }, (_, i) => i)
  }
  const out: number[] = []
  for (let i = 0; i < length; i++) {
    const row = decodeCompactEpisodeAt(compact, i)
    if (row && matchesSidebarSearch(row.name, query)) out.push(i)
  }
  return out
}

/** Immutable rename helper for optimistic RQ updates (v2 preferred). */
export function renameCompactEpisode(
  compact: CompactEpisodeIndex,
  episodeId: string,
  newName: string,
): CompactEpisodeIndex {
  const index = findCompactEpisodeIndexById(compact, episodeId)
  if (index < 0) return compact
  const row = decodeCompactEpisodeAt(compact, index)
  if (!row) return compact
  const split = splitIndexedName(row.episodeNumber, newName)

  if (compact.v === 2) {
    const t = compact.t.slice()
    t[index] = split.title
    const x = { ...(compact.x || {}) }
    if (typeof split.full === 'string') {
      x[String(index)] = split.full
    } else {
      delete x[String(index)]
    }
    const next: CompactEpisodeIndexV2 = {
      v: 2,
      id: compact.id,
      n: compact.n,
      t,
    }
    if (Object.keys(x).length > 0) next.x = x
    return next
  }

  const name = compact.name.slice()
  name[index] = newName
  return { v: 1, id: compact.id, n: compact.n, name }
}

function splitIndexedName(episodeNumber: number, name: string): { title: string; full?: string } {
  const withTitle = `第 ${episodeNumber} 集：`
  if (name.startsWith(withTitle)) {
    return { title: name.slice(withTitle.length) }
  }
  const bare = `第 ${episodeNumber} 集`
  if (name === bare) {
    return { title: '' }
  }
  return { title: '', full: name }
}

function joinIndexedName(episodeNumber: number, title: string, full?: string): string {
  if (typeof full === 'string') return full
  if (title === '') return `第 ${episodeNumber} 集`
  return `第 ${episodeNumber} 集：${title}`
}

/** Encode sidebar index (v2). */
export function encodeEpisodeIndex(episodes: EpisodeIndexItem[]): CompactEpisodeIndexV2 {
  const id: string[] = []
  const numbers: number[] = []
  const t: string[] = []
  const x: Record<string, string> = {}

  for (let i = 0; i < episodes.length; i++) {
    const episode = episodes[i]!
    id.push(uuidToBase64Url(episode.id))
    numbers.push(episode.episodeNumber)
    const split = splitIndexedName(episode.episodeNumber, episode.name)
    t.push(split.title)
    if (typeof split.full === 'string') {
      x[String(i)] = split.full
    }
  }

  const compact: CompactEpisodeIndexV2 = {
    v: 2,
    id,
    n: encodeEpisodeNumbersDelta(numbers),
    t,
  }
  if (Object.keys(x).length > 0) {
    compact.x = x
  }
  return compact
}

export function decodeEpisodeIndex(raw: unknown): EpisodeIndexItem[] {
  if (!raw) return []

  if (Array.isArray(raw)) {
    if (raw.length === 0) return []
    const first = raw[0]
    if (first && typeof first === 'object' && !Array.isArray(first) && 'id' in first) {
      return raw.map((item) => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id),
          episodeNumber: Number(row.episodeNumber) || 0,
          name: typeof row.name === 'string' ? row.name : '',
        }
      })
    }
    return []
  }

  if (typeof raw === 'object') {
    const compact = raw as Partial<CompactEpisodeIndexV1> | Partial<CompactEpisodeIndexV2>

    if (compact.v === 2 && Array.isArray(compact.id) && Array.isArray(compact.n) && Array.isArray(compact.t)) {
      const numbers = decodeEpisodeNumbersDelta(compact.n)
      const length = compact.id.length
      const overrides = compact.x && typeof compact.x === 'object' ? compact.x : undefined
      const episodes: EpisodeIndexItem[] = []
      for (let i = 0; i < length; i++) {
        const episodeNumber = numbers[i] ?? 0
        const full = overrides?.[String(i)]
        episodes.push({
          id: base64UrlToUuid(String(compact.id[i] ?? '')),
          episodeNumber,
          name: joinIndexedName(episodeNumber, typeof compact.t[i] === 'string' ? compact.t[i]! : '', full),
        })
      }
      return episodes
    }

    if (compact.v === 1 && Array.isArray(compact.id) && Array.isArray(compact.n) && Array.isArray(compact.name)) {
      const length = compact.id.length
      const episodes: EpisodeIndexItem[] = []
      for (let i = 0; i < length; i++) {
        episodes.push({
          id: String(compact.id[i] ?? ''),
          episodeNumber: Number(compact.n[i]) || 0,
          name: typeof compact.name[i] === 'string' ? compact.name[i]! : '',
        })
      }
      return episodes
    }
  }

  return []
}

export function attachDecodedEpisodeIndex<
  T extends { novelPromotionData?: { episodes?: unknown } | null },
>(project: T, episodes: EpisodeIndexItem[]): T {
  if (!project.novelPromotionData) return project
  return {
    ...project,
    novelPromotionData: {
      ...project.novelPromotionData,
      episodes,
    },
  }
}
