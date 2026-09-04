/**
 * Beginner video-stage self-check gates (P3.2).
 * Distilled from drama-skills motion/continuity findings — plain questions, no VID/REV IDs.
 */

export type VideoReviewGateId =
  | 'motion_from_frame'
  | 'action_small_clear'
  | 'no_new_story'
  | 'dialogue_match'
  | 'cut_continuity'
  | 'prompt_focused'
  | 'audio_intent'
  | 'playback_ready'

export type VideoReviewGate = {
  id: VideoReviewGateId
  enabled: boolean
}

export type VideoReviewHintId =
  | 'no_panels'
  | 'single_panel'
  | 'panels_missing_image'
  | 'panels_missing_video'
  | 'panels_missing_prompt'
  | 'panels_failed'

export type VideoReviewHint = {
  id: VideoReviewHintId
  severity: 'info' | 'warn'
  panelIds?: string[]
}

export type VideoReviewPanelInput = {
  panelId?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  videoPrompt?: string | null
  videoErrorMessage?: string | null
}

const ALL_GATES: readonly VideoReviewGate[] = [
  { id: 'motion_from_frame', enabled: true },
  { id: 'action_small_clear', enabled: true },
  { id: 'no_new_story', enabled: true },
  { id: 'dialogue_match', enabled: true },
  { id: 'cut_continuity', enabled: true },
  { id: 'prompt_focused', enabled: true },
  { id: 'audio_intent', enabled: true },
  { id: 'playback_ready', enabled: true },
]

export const VIDEO_REVIEW_GATES: readonly VideoReviewGate[] = ALL_GATES.filter((g) => g.enabled)

export function listVideoReviewGateIds(): VideoReviewGateId[] {
  return VIDEO_REVIEW_GATES.map((g) => g.id)
}

function panelKey(panel: VideoReviewPanelInput, index: number): string {
  const id = typeof panel.panelId === 'string' ? panel.panelId.trim() : ''
  return id || `panel_${index}`
}

export function resolveVideoReviewAutoHints(
  panels: readonly VideoReviewPanelInput[],
): VideoReviewHint[] {
  if (panels.length === 0) {
    return [{ id: 'no_panels', severity: 'info' }]
  }

  const hints: VideoReviewHint[] = []
  const keyed = panels.map((panel, index) => ({ panel, id: panelKey(panel, index) }))

  if (keyed.length === 1) {
    hints.push({ id: 'single_panel', severity: 'info', panelIds: [keyed[0].id] })
  }

  const missingImage = keyed
    .filter(({ panel }) => !String(panel.imageUrl || '').trim())
    .map(({ id }) => id)
  if (missingImage.length > 0) {
    hints.push({ id: 'panels_missing_image', severity: 'warn', panelIds: missingImage })
  }

  const missingVideo = keyed
    .filter(({ panel }) => !String(panel.videoUrl || '').trim())
    .map(({ id }) => id)
  if (missingVideo.length > 0) {
    hints.push({ id: 'panels_missing_video', severity: 'warn', panelIds: missingVideo })
  }

  const missingPrompt = keyed
    .filter(({ panel }) => !String(panel.videoPrompt || '').trim())
    .map(({ id }) => id)
  if (missingPrompt.length > 0) {
    hints.push({ id: 'panels_missing_prompt', severity: 'info', panelIds: missingPrompt })
  }

  const failed = keyed
    .filter(({ panel }) => String(panel.videoErrorMessage || '').trim().length > 0)
    .map(({ id }) => id)
  if (failed.length > 0) {
    hints.push({ id: 'panels_failed', severity: 'warn', panelIds: failed })
  }

  return hints
}

export function resolveVideoReviewProgress(
  checkedIds: readonly string[],
  gateIds: readonly VideoReviewGateId[] = listVideoReviewGateIds(),
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

export function buildVideoReviewStorageKey(
  projectId: string,
  episodeId?: string | null,
): string {
  const episode = episodeId && episodeId.trim() ? episodeId.trim() : 'default'
  return `waoowaoo:video-review:${projectId}:${episode}`
}

export function parseStoredVideoCheckedGateIds(raw: string | null): VideoReviewGateId[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const allowed = new Set(listVideoReviewGateIds())
    return parsed.filter(
      (id): id is VideoReviewGateId =>
        typeof id === 'string' && allowed.has(id as VideoReviewGateId),
    )
  } catch {
    return []
  }
}
