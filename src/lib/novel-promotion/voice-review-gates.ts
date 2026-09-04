/**
 * Beginner voice-stage self-check gates (P6.3).
 * Plain questions for dialogue/voice readiness — no craft ID prefixes.
 */

export type VoiceReviewGateId =
  | 'speakers_have_voice'
  | 'lines_complete'
  | 'speaker_attribution'
  | 'emotion_fit'
  | 'panel_match'
  | 'audio_ready'
  | 'listen_pass'
  | 'export_ready'

export type VoiceReviewGate = {
  id: VoiceReviewGateId
  enabled: boolean
}

export type VoiceReviewHintId =
  | 'no_lines'
  | 'single_line'
  | 'speakers_missing_voice'
  | 'lines_missing_audio'
  | 'lines_missing_panel'
  | 'lines_empty_content'

export type VoiceReviewHint = {
  id: VoiceReviewHintId
  severity: 'info' | 'warn'
  lineIds?: string[]
}

export type VoiceReviewLineInput = {
  lineId?: string | null
  speaker?: string | null
  content?: string | null
  audioUrl?: string | null
  matchedPanelId?: string | null
  speakerHasVoice?: boolean
}

const ALL_GATES: readonly VoiceReviewGate[] = [
  { id: 'speakers_have_voice', enabled: true },
  { id: 'lines_complete', enabled: true },
  { id: 'speaker_attribution', enabled: true },
  { id: 'emotion_fit', enabled: true },
  { id: 'panel_match', enabled: true },
  { id: 'audio_ready', enabled: true },
  { id: 'listen_pass', enabled: true },
  { id: 'export_ready', enabled: true },
]

export const VOICE_REVIEW_GATES: readonly VoiceReviewGate[] = ALL_GATES.filter((g) => g.enabled)

export function listVoiceReviewGateIds(): VoiceReviewGateId[] {
  return VOICE_REVIEW_GATES.map((g) => g.id)
}

function lineKey(line: VoiceReviewLineInput, index: number): string {
  const id = typeof line.lineId === 'string' ? line.lineId.trim() : ''
  return id || `line_${index}`
}

export function resolveVoiceReviewAutoHints(
  lines: readonly VoiceReviewLineInput[],
): VoiceReviewHint[] {
  if (lines.length === 0) {
    return [{ id: 'no_lines', severity: 'info' }]
  }

  const hints: VoiceReviewHint[] = []
  const keyed = lines.map((line, index) => ({ line, id: lineKey(line, index) }))

  if (keyed.length === 1) {
    hints.push({ id: 'single_line', severity: 'info', lineIds: [keyed[0].id] })
  }

  const emptyContent = keyed
    .filter(({ line }) => !String(line.content || '').trim())
    .map(({ id }) => id)
  if (emptyContent.length > 0) {
    hints.push({ id: 'lines_empty_content', severity: 'warn', lineIds: emptyContent })
  }

  const missingVoice = keyed
    .filter(({ line }) => line.speakerHasVoice === false)
    .map(({ id }) => id)
  if (missingVoice.length > 0) {
    hints.push({ id: 'speakers_missing_voice', severity: 'warn', lineIds: missingVoice })
  }

  const missingAudio = keyed
    .filter(({ line }) => !String(line.audioUrl || '').trim())
    .map(({ id }) => id)
  if (missingAudio.length > 0) {
    hints.push({ id: 'lines_missing_audio', severity: 'warn', lineIds: missingAudio })
  }

  const missingPanel = keyed
    .filter(({ line }) => !String(line.matchedPanelId || '').trim())
    .map(({ id }) => id)
  if (missingPanel.length > 0) {
    hints.push({ id: 'lines_missing_panel', severity: 'info', lineIds: missingPanel })
  }

  return hints
}

export function resolveVoiceReviewProgress(
  checkedIds: readonly string[],
  gateIds: readonly VoiceReviewGateId[] = listVoiceReviewGateIds(),
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

export function buildVoiceReviewStorageKey(
  projectId: string,
  episodeId?: string | null,
): string {
  const episode = episodeId && episodeId.trim() ? episodeId.trim() : 'default'
  return `waoowaoo:voice-review:${projectId}:${episode}`
}

export function parseStoredVoiceCheckedGateIds(raw: string | null): VoiceReviewGateId[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const allowed = new Set(listVoiceReviewGateIds())
    return parsed.filter(
      (id): id is VoiceReviewGateId =>
        typeof id === 'string' && allowed.has(id as VoiceReviewGateId),
    )
  } catch {
    return []
  }
}
