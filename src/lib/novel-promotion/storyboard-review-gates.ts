/**
 * Beginner storyboard self-check gates (P3.1).
 * Distilled from drama-skills visual/motion rubric — plain questions, no VID/REV IDs.
 */

export type StoryboardReviewGateId =
  | 'shot_purpose'
  | 'covers_action'
  | 'still_keyframe'
  | 'continuity'
  | 'shot_variety'
  | 'asset_bound'
  | 'no_invented_fact'
  | 'images_ready'

export type StoryboardReviewGate = {
  id: StoryboardReviewGateId
  enabled: boolean
}

export type StoryboardReviewHintId =
  | 'no_storyboards'
  | 'no_panels'
  | 'panels_missing_image'
  | 'panels_missing_description'
  | 'panels_missing_characters'
  | 'single_panel'

export type StoryboardReviewHint = {
  id: StoryboardReviewHintId
  severity: 'info' | 'warn'
  panelIds?: string[]
}

export type StoryboardReviewPanelInput = {
  id: string
  description?: string | null
  imagePrompt?: string | null
  imageUrl?: string | null
  characters?: string | null
  location?: string | null
}

export type StoryboardReviewBoardInput = {
  id: string
  panels?: StoryboardReviewPanelInput[] | null
}

const ALL_GATES: readonly StoryboardReviewGate[] = [
  { id: 'shot_purpose', enabled: true },
  { id: 'covers_action', enabled: true },
  { id: 'still_keyframe', enabled: true },
  { id: 'continuity', enabled: true },
  { id: 'shot_variety', enabled: true },
  { id: 'asset_bound', enabled: true },
  { id: 'no_invented_fact', enabled: true },
  { id: 'images_ready', enabled: true },
]

export const STORYBOARD_REVIEW_GATES: readonly StoryboardReviewGate[] =
  ALL_GATES.filter((g) => g.enabled)

export function listStoryboardReviewGateIds(): StoryboardReviewGateId[] {
  return STORYBOARD_REVIEW_GATES.map((g) => g.id)
}

function flattenPanels(
  storyboards: readonly StoryboardReviewBoardInput[],
): StoryboardReviewPanelInput[] {
  const panels: StoryboardReviewPanelInput[] = []
  for (const board of storyboards) {
    if (!Array.isArray(board.panels)) continue
    for (const panel of board.panels) {
      if (panel?.id) panels.push(panel)
    }
  }
  return panels
}

function hasCharacters(raw: string | null | undefined): boolean {
  if (!raw || !raw.trim()) return false
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.length > 0
  } catch {
    // plain string
  }
  return raw.split(',').some((part) => part.trim().length > 0)
}

export function resolveStoryboardReviewAutoHints(
  storyboards: readonly StoryboardReviewBoardInput[],
): StoryboardReviewHint[] {
  if (storyboards.length === 0) {
    return [{ id: 'no_storyboards', severity: 'info' }]
  }

  const panels = flattenPanels(storyboards)
  if (panels.length === 0) {
    return [{ id: 'no_panels', severity: 'warn' }]
  }

  const hints: StoryboardReviewHint[] = []

  if (panels.length === 1) {
    hints.push({ id: 'single_panel', severity: 'info', panelIds: [panels[0].id] })
  }

  const missingImage = panels
    .filter((panel) => !String(panel.imageUrl || '').trim())
    .map((panel) => panel.id)
  if (missingImage.length > 0) {
    hints.push({ id: 'panels_missing_image', severity: 'warn', panelIds: missingImage })
  }

  const missingDescription = panels
    .filter((panel) => {
      const desc = String(panel.description || '').trim()
      const prompt = String(panel.imagePrompt || '').trim()
      return !desc && !prompt
    })
    .map((panel) => panel.id)
  if (missingDescription.length > 0) {
    hints.push({ id: 'panels_missing_description', severity: 'warn', panelIds: missingDescription })
  }

  const missingCharacters = panels
    .filter((panel) => !hasCharacters(panel.characters))
    .map((panel) => panel.id)
  if (missingCharacters.length > 0) {
    hints.push({ id: 'panels_missing_characters', severity: 'info', panelIds: missingCharacters })
  }

  return hints
}

export function resolveStoryboardReviewProgress(
  checkedIds: readonly string[],
  gateIds: readonly StoryboardReviewGateId[] = listStoryboardReviewGateIds(),
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

export function buildStoryboardReviewStorageKey(
  projectId: string,
  episodeId?: string | null,
): string {
  const episode = episodeId && episodeId.trim() ? episodeId.trim() : 'default'
  return `waoowaoo:storyboard-review:${projectId}:${episode}`
}

export function parseStoredStoryboardCheckedGateIds(raw: string | null): StoryboardReviewGateId[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const allowed = new Set(listStoryboardReviewGateIds())
    return parsed.filter(
      (id): id is StoryboardReviewGateId =>
        typeof id === 'string' && allowed.has(id as StoryboardReviewGateId),
    )
  } catch {
    return []
  }
}
