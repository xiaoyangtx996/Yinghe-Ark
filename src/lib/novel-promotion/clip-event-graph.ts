/**
 * Beginner clip → event-node projection (P2.2).
 * Reframes story→script clips as a readable beat timeline — no new extraction API.
 */

export type ClipEventKind = 'opening' | 'beat' | 'ending'

export type ClipEventSource = {
  id: string
  summary?: string | null
  content?: string | null
  characters?: string | null
  location?: string | null
}

export type ClipEventNode = {
  id: string
  index: number
  kind: ClipEventKind
  title: string
  summary: string
  characters: string[]
  location: string | null
}

const TITLE_MAX = 24

export function parseClipCharacterNames(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      const names: string[] = []
      for (const item of parsed) {
        if (typeof item === 'string' && item.trim()) {
          names.push(item.trim())
          continue
        }
        if (item && typeof item === 'object') {
          const name = (item as { name?: unknown }).name
          if (typeof name === 'string' && name.trim()) names.push(name.trim())
        }
      }
      return names
    }
  } catch {
    // fall through to comma split
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function parseClipLocationLabel(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      const parts = parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
      return parts.length > 0 ? parts.join('、') : null
    }
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim()
  } catch {
    // plain string
  }
  const trimmed = raw.trim()
  return trimmed || null
}

export function resolveClipEventKind(index: number, total: number): ClipEventKind {
  if (total <= 0) return 'beat'
  if (index === 0) return 'opening'
  if (index === total - 1 && total > 1) return 'ending'
  return 'beat'
}

function resolveTitle(summary: string, content: string, index: number): string {
  const fromSummary = summary.trim()
  if (fromSummary) {
    return fromSummary.length > TITLE_MAX
      ? `${fromSummary.slice(0, TITLE_MAX)}…`
      : fromSummary
  }
  const fromContent = content.trim().replace(/\s+/g, ' ')
  if (fromContent) {
    return fromContent.length > TITLE_MAX
      ? `${fromContent.slice(0, TITLE_MAX)}…`
      : fromContent
  }
  return `片段 ${index + 1}`
}

export function resolveClipEventNodes(
  clips: readonly ClipEventSource[],
): ClipEventNode[] {
  const total = clips.length
  return clips.map((clip, index) => {
    const summary = typeof clip.summary === 'string' ? clip.summary : ''
    const content = typeof clip.content === 'string' ? clip.content : ''
    return {
      id: clip.id,
      index,
      kind: resolveClipEventKind(index, total),
      title: resolveTitle(summary, content, index),
      summary: summary.trim() || content.trim(),
      characters: parseClipCharacterNames(clip.characters),
      location: parseClipLocationLabel(clip.location),
    }
  })
}
