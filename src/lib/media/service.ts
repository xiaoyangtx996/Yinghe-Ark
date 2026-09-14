import path from 'node:path'
import { AsyncLocalStorage } from 'node:async_hooks'
import { prisma } from '@/lib/prisma'
import { extractStorageKey } from '@/lib/storage'
import { stablePublicIdFromStorageKey } from './hash'
import type { MediaRef } from './types'

type MediaObjectRow = {
  id: string
  publicId: string
  storageKey: string
  sha256: string | null
  mimeType: string | null
  sizeBytes: bigint | number | null
  width: number | null
  height: number | null
  durationMs: number | null
  updatedAt: Date | string
}

type MediaModel = {
  findUnique: (args: unknown) => Promise<unknown>
  findMany: (args: unknown) => Promise<unknown>
  upsert: (args: unknown) => Promise<unknown>
}

const mediaModel = (prisma as unknown as { mediaObject: MediaModel }).mediaObject

/** Request-scoped cache so attachMedia* can reuse identical mediaId/storageKey lookups. */
const mediaResolveCache = new AsyncLocalStorage<Map<string, Promise<MediaRef | null>>>()

function cachedResolve(key: string, factory: () => Promise<MediaRef | null>): Promise<MediaRef | null> {
  const store = mediaResolveCache.getStore()
  if (!store) return factory()
  const existing = store.get(key)
  if (existing) return existing
  const pending = factory()
  store.set(key, pending)
  return pending
}

export function runWithMediaResolveCache<T>(fn: () => Promise<T>): Promise<T> {
  return mediaResolveCache.run(new Map(), fn)
}

/**
 * Seed the request-scoped cache with a single findMany for distinct media ids.
 * No-ops outside runWithMediaResolveCache. Missing ids are cached as null.
 * Found rows also seed `key:` and `public:` aliases.
 */
export async function prefetchMediaObjectsByIds(ids: Iterable<string>): Promise<void> {
  const store = mediaResolveCache.getStore()
  if (!store) return

  const unique: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (typeof id !== 'string') continue
    const trimmed = id.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    if (!store.has(`id:${trimmed}`)) unique.push(trimmed)
  }
  if (unique.length === 0) return

  const rows = (await mediaModel.findMany({
    where: { id: { in: unique } },
  })) as MediaObjectRow[]
  const byId = new Map(rows.map((row) => [row.id, row]))

  for (const id of unique) {
    const row = byId.get(id)
    const ref = row ? mapMediaObjectToRef(row) : null
    store.set(`id:${id}`, Promise.resolve(ref))
    if (row && ref) {
      store.set(`key:${row.storageKey}`, Promise.resolve(ref))
      store.set(`public:${row.publicId}`, Promise.resolve(ref))
    }
  }
}

/**
 * Seed cache for known storage keys via one findMany.
 * Missing keys are left unset so ensureMediaObjectFromStorageKey can still upsert.
 */
export async function prefetchMediaObjectsByStorageKeys(keys: Iterable<string>): Promise<void> {
  const store = mediaResolveCache.getStore()
  if (!store) return

  const unique: string[] = []
  const seen = new Set<string>()
  for (const key of keys) {
    if (typeof key !== 'string') continue
    const normalized = normalizeStorageKey(key.trim())
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    if (!store.has(`key:${normalized}`)) unique.push(normalized)
  }
  if (unique.length === 0) return

  const rows = (await mediaModel.findMany({
    where: { storageKey: { in: unique } },
  })) as MediaObjectRow[]

  for (const row of rows) {
    const ref = mapMediaObjectToRef(row)
    store.set(`key:${row.storageKey}`, Promise.resolve(ref))
    store.set(`id:${row.id}`, Promise.resolve(ref))
    store.set(`public:${row.publicId}`, Promise.resolve(ref))
  }
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
}

function normalizeStorageKey(value: string): string {
  return value.replace(/^\/+/, '')
}

function isLikelyExternalUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function guessMimeTypeFromStorageKey(storageKey: string): string | null {
  const ext = path.extname(storageKey).toLowerCase()
  return MIME_BY_EXT[ext] || null
}

function mediaUrl(publicId: string): string {
  return `/m/${encodeURIComponent(publicId)}`
}

function extractPublicIdFromMediaRoute(value: string): string | null {
  if (!value.startsWith('/m/')) return null
  const routePart = value.split('?')[0]?.split('#')[0] || ''
  const encoded = routePart.replace('/m/', '').replace(/^\/+/, '')
  if (!encoded) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

function mapMediaObjectToRef(row: MediaObjectRow): MediaRef {
  return {
    id: row.id,
    publicId: row.publicId,
    url: mediaUrl(row.publicId),
    sha256: row.sha256,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes == null ? null : Number(row.sizeBytes),
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    storageKey: row.storageKey,
  }
}

export async function ensureMediaObjectFromStorageKey(
  rawStorageKey: string,
  metadata?: Partial<Pick<MediaRef, 'mimeType' | 'sizeBytes' | 'width' | 'height' | 'durationMs'>>,
): Promise<MediaRef> {
  const storageKey = normalizeStorageKey(rawStorageKey)

  return cachedResolve(`key:${storageKey}`, async () => {
    const existing = (await mediaModel.findUnique({ where: { storageKey } })) as MediaObjectRow | null
    if (existing != null) {
      return mapMediaObjectToRef(existing)
    }

    const publicId = stablePublicIdFromStorageKey(storageKey)
    try {
      const created = (await mediaModel.upsert({
        where: { publicId },
        update: {
          storageKey,
          mimeType: metadata?.mimeType ?? guessMimeTypeFromStorageKey(storageKey),
          sizeBytes: metadata?.sizeBytes == null ? undefined : BigInt(metadata.sizeBytes),
          width: metadata?.width ?? undefined,
          height: metadata?.height ?? undefined,
          durationMs: metadata?.durationMs ?? undefined,
        },
        create: {
          publicId,
          storageKey,
          mimeType: metadata?.mimeType ?? guessMimeTypeFromStorageKey(storageKey),
          sizeBytes: metadata?.sizeBytes == null ? null : BigInt(metadata.sizeBytes),
          width: metadata?.width ?? null,
          height: metadata?.height ?? null,
          durationMs: metadata?.durationMs ?? null,
        },
      })) as MediaObjectRow

      return mapMediaObjectToRef(created)
    } catch (error: unknown) {
      // P2002 = unique constraint violation. Another concurrent request already
      // created/updated the row.  Re-fetch instead of crashing.
      const code = (error as { code?: string })?.code
      if (code === 'P2002') {
        const fallback = (await mediaModel.findUnique({ where: { publicId } })) as MediaObjectRow | null
          ?? (await mediaModel.findUnique({ where: { storageKey } })) as MediaObjectRow | null
        if (fallback) return mapMediaObjectToRef(fallback)
      }
      throw error
    }
  }) as Promise<MediaRef>
}

export async function getMediaObjectByPublicId(publicId: string) {
  return cachedResolve(`public:${publicId}`, async () => {
    const row = (await mediaModel.findUnique({ where: { publicId } })) as MediaObjectRow | null
    if (!row) return null
    return mapMediaObjectToRef(row)
  })
}

export async function getMediaObjectById(id: string) {
  return cachedResolve(`id:${id}`, async () => {
    const row = (await mediaModel.findUnique({ where: { id } })) as MediaObjectRow | null
    if (!row) return null
    return mapMediaObjectToRef(row)
  })
}

/**
 * 将任意媒体值（COS key / 签名URL / /m/publicId / 对象形态）归一化为 storageKey。
 * 这是服务端写路径（保存、比较、删除）应使用的唯一入口。
 */
export async function resolveStorageKeyFromMediaValue(value: unknown): Promise<string | null> {
  if (typeof value === 'string') {
    const publicId = extractPublicIdFromMediaRoute(value)
    if (publicId) {
      const media = await getMediaObjectByPublicId(publicId)
      return media?.storageKey || null
    }
    const key = extractStorageKey(value)
    return key ? normalizeStorageKey(key) : null
  }

  if (value && typeof value === 'object') {
    const maybeValue = (value as { url?: unknown; imageUrl?: unknown; key?: unknown }).url
      ?? (value as { imageUrl?: unknown }).imageUrl
      ?? (value as { key?: unknown }).key
    return resolveStorageKeyFromMediaValue(maybeValue)
  }

  return null
}

export function extractStorageKeyFromLegacyValue(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  if (value.startsWith('/m/')) return null

  // Keep external URLs that are actually COS object URLs (path -> key).
  if (isLikelyExternalUrl(value) || value.startsWith('/api/files/') || !value.startsWith('/')) {
    return extractStorageKey(value)
  }

  return null
}

export async function resolveMediaRefFromLegacyValue(value: unknown): Promise<MediaRef | null> {
  const storageKey = extractStorageKeyFromLegacyValue(value)
  if (!storageKey) return null
  return ensureMediaObjectFromStorageKey(storageKey)
}

export async function resolveMediaRef(
  mediaId: unknown,
  legacyValue: unknown,
): Promise<MediaRef | null> {
  if (typeof mediaId === 'string' && mediaId.trim()) {
    const mediaById = await getMediaObjectById(mediaId)
    if (mediaById) return mediaById
  }
  return resolveMediaRefFromLegacyValue(legacyValue)
}

export async function resolveMediaRefsFromLegacyJsonArray(jsonStr: unknown): Promise<MediaRef[]> {
  if (typeof jsonStr !== 'string' || !jsonStr.trim()) return []
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return []

    const refs = await Promise.all(
      parsed
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map((v) => resolveMediaRefFromLegacyValue(v)),
    )

    return refs.filter((v): v is MediaRef => !!v)
  } catch {
    return []
  }
}

export function mediaUrlFromRef(ref: MediaRef | null | undefined, fallback: string | null | undefined): string | null {
  if (ref?.url) return ref.url
  return fallback || null
}
