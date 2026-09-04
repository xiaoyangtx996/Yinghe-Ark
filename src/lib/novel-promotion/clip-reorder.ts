/**
 * Clip reorder helpers (P3.3 adjacent + P3.5 drag).
 * Persists via storyboard-group PUT (swap or reassign clip createdAt).
 */

export type ClipMoveDirection = 'up' | 'down'

export type AdjacentClipMove = {
  fromIndex: number
  toIndex: number
  neighborId: string
}

export type ClipDragReorder = {
  fromIndex: number
  toIndex: number
  nextOrder: string[]
}

export type ClipCreatedAtUpdate = {
  id: string
  createdAt: Date
}

/** Resolve the neighbor clip to swap with, or null at boundaries / unknown id. */
export function resolveAdjacentClipMove(
  orderedIds: readonly string[],
  clipId: string,
  direction: ClipMoveDirection,
): AdjacentClipMove | null {
  const fromIndex = orderedIds.findIndex((id) => id === clipId)
  if (fromIndex < 0) return null
  const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
  if (toIndex < 0 || toIndex >= orderedIds.length) return null
  const neighborId = orderedIds[toIndex]
  if (!neighborId) return null
  return { fromIndex, toIndex, neighborId }
}

export function canMoveClip(
  orderedIds: readonly string[],
  clipId: string,
  direction: ClipMoveDirection,
): boolean {
  return resolveAdjacentClipMove(orderedIds, clipId, direction) != null
}

/**
 * dnd-kit style: remove active, insert at over's index.
 * Returns null when ids are missing or unchanged.
 */
export function resolveClipDragReorder(
  orderedIds: readonly string[],
  activeId: string,
  overId: string,
): ClipDragReorder | null {
  if (activeId === overId) return null
  const fromIndex = orderedIds.findIndex((id) => id === activeId)
  const toIndex = orderedIds.findIndex((id) => id === overId)
  if (fromIndex < 0 || toIndex < 0) return null

  const nextOrder = [...orderedIds]
  const [moved] = nextOrder.splice(fromIndex, 1)
  if (!moved) return null
  nextOrder.splice(toIndex, 0, moved)

  if (nextOrder.every((id, i) => id === orderedIds[i])) return null
  return { fromIndex, toIndex, nextOrder }
}

/**
 * Reorder clip objects to match nextOrder (optimistic UI / cache).
 * Returns null on length or id mismatch.
 */
export function applyClipIdOrder<T extends { id: string }>(
  clips: readonly T[],
  nextOrder: readonly string[],
): T[] | null {
  if (clips.length === 0 || nextOrder.length !== clips.length) return null
  const byId = new Map(clips.map((clip) => [clip.id, clip]))
  if (byId.size !== nextOrder.length) return null

  const result: T[] = []
  for (const id of nextOrder) {
    const clip = byId.get(id)
    if (!clip) return null
    result.push(clip)
  }
  return result
}

/**
 * Keep the ascending createdAt timeline; assign those timestamps to nextOrder.
 * Used so a single transaction can persist an arbitrary drag reorder.
 */
export function buildClipCreatedAtUpdates(
  clips: readonly { id: string; createdAt: Date | string | number }[],
  nextOrder: readonly string[],
): ClipCreatedAtUpdate[] | null {
  if (clips.length === 0 || nextOrder.length !== clips.length) return null

  const byId = new Map(clips.map((clip) => [clip.id, clip]))
  for (const id of nextOrder) {
    if (!byId.has(id)) return null
  }
  if (byId.size !== nextOrder.length) return null

  const sortedTimes = [...clips]
    .map((clip) => new Date(clip.createdAt).getTime())
    .sort((a, b) => a - b)

  // Keep relative order keys unique so orderBy createdAt asc stays deterministic.
  const uniqueTimes: number[] = []
  let prev = Number.NEGATIVE_INFINITY
  for (const time of sortedTimes) {
    const next = time > prev ? time : prev + 1
    uniqueTimes.push(next)
    prev = next
  }

  return nextOrder.map((id, index) => ({
    id,
    createdAt: new Date(uniqueTimes[index]!),
  }))
}
