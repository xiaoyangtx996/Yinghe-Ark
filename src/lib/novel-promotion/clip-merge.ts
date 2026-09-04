/**
 * Adjacent clip merge helpers (P3.4).
 * Keep earlier clip by default when merging with next; absorb later clip.
 */

import { parseClipCharacterNames } from '@/lib/novel-promotion/clip-event-graph'

export type ClipMergeSource = {
  id: string
  summary?: string | null
  content?: string | null
  characters?: string | null
  location?: string | null
  props?: string | null
  screenplay?: string | null
  startText?: string | null
  endText?: string | null
}

export type MergedClipFields = {
  summary: string
  content: string
  characters: string | null
  location: string | null
  props: string | null
  screenplay: string | null
  startText: string | null
  endText: string | null
}

export type AdjacentClipMergeTarget = {
  keepClipId: string
  absorbClipId: string
  keepIndex: number
  absorbIndex: number
}

function uniqueJoin(names: string[]): string | null {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    ordered.push(trimmed)
  }
  if (ordered.length === 0) return null
  return JSON.stringify(ordered)
}

function mergeTextBlocks(a: string, b: string): string {
  const left = a.trim()
  const right = b.trim()
  if (left && right) return `${left}\n\n${right}`
  return left || right
}

function mergeSummary(a: string, b: string): string {
  const left = a.trim()
  const right = b.trim()
  if (left && right) {
    if (left === right) return left
    return `${left} / ${right}`
  }
  return left || right
}

function mergeJsonNameField(a: string | null | undefined, b: string | null | undefined): string | null {
  return uniqueJoin([
    ...parseClipCharacterNames(a),
    ...parseClipCharacterNames(b),
  ])
}

/** Prefer plain string for a single location (matches story→script storage + exact asset matchers). */
function mergeLocationField(a: string | null | undefined, b: string | null | undefined): string | null {
  const names = [
    ...parseClipCharacterNames(a),
    ...parseClipCharacterNames(b),
  ]
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    ordered.push(trimmed)
  }
  if (ordered.length === 0) return null
  if (ordered.length === 1) return ordered[0]!
  return JSON.stringify(ordered)
}

function mergeScreenplay(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const left = typeof a === 'string' ? a.trim() : ''
  const right = typeof b === 'string' ? b.trim() : ''
  if (!left && !right) return null
  if (!left) return right || null
  if (!right) return left || null

  try {
    const leftObj = JSON.parse(left) as { scenes?: unknown }
    const rightObj = JSON.parse(right) as { scenes?: unknown }
    const leftScenes = Array.isArray(leftObj.scenes) ? leftObj.scenes : []
    const rightScenes = Array.isArray(rightObj.scenes) ? rightObj.scenes : []
    if (leftScenes.length > 0 || rightScenes.length > 0) {
      return JSON.stringify({ scenes: [...leftScenes, ...rightScenes] })
    }
  } catch {
    // fall through to text join
  }
  return mergeTextBlocks(left, right)
}

/** Prefer keep's startText and absorb's endText when present. */
export function buildMergedClipFields(
  keep: ClipMergeSource,
  absorb: ClipMergeSource,
): MergedClipFields {
  const keepStart = typeof keep.startText === 'string' ? keep.startText.trim() : ''
  const absorbStart = typeof absorb.startText === 'string' ? absorb.startText.trim() : ''
  const keepEnd = typeof keep.endText === 'string' ? keep.endText.trim() : ''
  const absorbEnd = typeof absorb.endText === 'string' ? absorb.endText.trim() : ''

  return {
    summary: mergeSummary(String(keep.summary || ''), String(absorb.summary || '')),
    content: mergeTextBlocks(String(keep.content || ''), String(absorb.content || '')),
    characters: mergeJsonNameField(keep.characters, absorb.characters),
    location: mergeLocationField(keep.location, absorb.location),
    props: mergeJsonNameField(keep.props, absorb.props),
    screenplay: mergeScreenplay(keep.screenplay, absorb.screenplay),
    startText: keepStart || absorbStart || null,
    endText: absorbEnd || keepEnd || null,
  }
}

/** Merge selected clip with the next clip in order (keep selected, absorb next). */
export function resolveMergeWithNext(
  orderedIds: readonly string[],
  clipId: string,
): AdjacentClipMergeTarget | null {
  const keepIndex = orderedIds.findIndex((id) => id === clipId)
  if (keepIndex < 0) return null
  const absorbIndex = keepIndex + 1
  if (absorbIndex >= orderedIds.length) return null
  const absorbClipId = orderedIds[absorbIndex]
  if (!absorbClipId) return null
  return {
    keepClipId: clipId,
    absorbClipId,
    keepIndex,
    absorbIndex,
  }
}

export function canMergeWithNext(orderedIds: readonly string[], clipId: string): boolean {
  return resolveMergeWithNext(orderedIds, clipId) != null
}
