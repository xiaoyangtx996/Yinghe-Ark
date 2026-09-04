/**
 * Beginner script self-check gates (P2.3).
 * Distilled from drama-skills story/script rubric — plain questions, no STY/SCR IDs.
 */

import { parseClipCharacterNames, parseClipLocationLabel } from '@/lib/novel-promotion/clip-event-graph'

export type ScriptReviewGateId =
  | 'opening_pressure'
  | 'want_vs_block'
  | 'turn_choice'
  | 'local_payoff'
  | 'next_state'
  | 'scene_change'
  | 'dialogue_want'
  | 'turn_setup'

export type ScriptReviewGate = {
  id: ScriptReviewGateId
  /** i18n key under scriptView.review.gates.<id> — label + tip */
  enabled: boolean
}

export type ScriptReviewHintId =
  | 'no_clips'
  | 'single_clip'
  | 'missing_summary'
  | 'missing_characters'
  | 'missing_location'

export type ScriptReviewHint = {
  id: ScriptReviewHintId
  severity: 'info' | 'warn'
  /** clip ids involved when applicable */
  clipIds?: string[]
}

export type ScriptReviewClipInput = {
  id: string
  summary?: string | null
  content?: string | null
  characters?: string | null
  location?: string | null
}

const ALL_GATES: readonly ScriptReviewGate[] = [
  { id: 'opening_pressure', enabled: true },
  { id: 'want_vs_block', enabled: true },
  { id: 'turn_choice', enabled: true },
  { id: 'local_payoff', enabled: true },
  { id: 'next_state', enabled: true },
  { id: 'scene_change', enabled: true },
  { id: 'dialogue_want', enabled: true },
  { id: 'turn_setup', enabled: true },
]

export const SCRIPT_REVIEW_GATES: readonly ScriptReviewGate[] = ALL_GATES.filter((g) => g.enabled)

export function listScriptReviewGateIds(): ScriptReviewGateId[] {
  return SCRIPT_REVIEW_GATES.map((g) => g.id)
}

export function resolveScriptReviewAutoHints(
  clips: readonly ScriptReviewClipInput[],
): ScriptReviewHint[] {
  if (clips.length === 0) {
    return [{ id: 'no_clips', severity: 'info' }]
  }

  const hints: ScriptReviewHint[] = []

  if (clips.length === 1) {
    hints.push({ id: 'single_clip', severity: 'info', clipIds: [clips[0].id] })
  }

  const missingSummary = clips
    .filter((clip) => !String(clip.summary || '').trim() && !String(clip.content || '').trim())
    .map((clip) => clip.id)
  if (missingSummary.length > 0) {
    hints.push({ id: 'missing_summary', severity: 'warn', clipIds: missingSummary })
  }

  const missingCharacters = clips
    .filter((clip) => parseClipCharacterNames(clip.characters).length === 0)
    .map((clip) => clip.id)
  if (missingCharacters.length > 0) {
    hints.push({ id: 'missing_characters', severity: 'warn', clipIds: missingCharacters })
  }

  const missingLocation = clips
    .filter((clip) => parseClipLocationLabel(clip.location) == null)
    .map((clip) => clip.id)
  if (missingLocation.length > 0) {
    hints.push({ id: 'missing_location', severity: 'info', clipIds: missingLocation })
  }

  return hints
}

export function resolveScriptReviewProgress(
  checkedIds: readonly string[],
  gateIds: readonly ScriptReviewGateId[] = listScriptReviewGateIds(),
): { checked: number; total: number; ratio: number } {
  const checkedSet = new Set(checkedIds)
  const checked = gateIds.filter((id) => checkedSet.has(id)).length
  const total = gateIds.length
  return {
    checked,
    total,
    ratio: total === 0 ? 0 : checked / total,
  }
}

export function buildScriptReviewStorageKey(projectId: string, episodeId?: string | null): string {
  const episode = episodeId && episodeId.trim() ? episodeId.trim() : 'default'
  return `waoowaoo:script-review:${projectId}:${episode}`
}

export function parseStoredCheckedGateIds(raw: string | null): ScriptReviewGateId[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const allowed = new Set(listScriptReviewGateIds())
    return parsed.filter((id): id is ScriptReviewGateId => typeof id === 'string' && allowed.has(id as ScriptReviewGateId))
  } catch {
    return []
  }
}
