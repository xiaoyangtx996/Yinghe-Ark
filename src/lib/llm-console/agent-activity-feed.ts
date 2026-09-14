/**
 * Beginner-facing activity feed derived from run-stream stages (P2.1).
 * Distills Toonflow-style layered logs — no Agent jargon, no extra APIs.
 */

export type ActivityFeedLayer = 'understand' | 'craft' | 'check'

export type ActivityFeedStatus = 'pending' | 'active' | 'done' | 'failed'

export type ActivityFeedStageInput = {
  id: string
  title: string
  status: string
  subtitle?: string
  retryable?: boolean
}

export type ActivityFeedItem = {
  id: string
  layer: ActivityFeedLayer
  title: string
  status: ActivityFeedStatus
  subtitle?: string
  retryable?: boolean
}

function normalizeFeedStatus(status: string): ActivityFeedStatus {
  if (status === 'completed' || status === 'stale') return 'done'
  if (status === 'failed') return 'failed'
  if (status === 'processing' || status === 'queued') return 'active'
  return 'pending'
}

/** Map step id to a beginner-readable layer (not product Agent roles). */
export function resolveActivityFeedLayer(stepId: string): ActivityFeedLayer {
  const id = stepId.toLowerCase()
  if (
    id.includes('screenplay') ||
    id.includes('storyboard') ||
    id.includes('cinematography') ||
    id.includes('acting') ||
    id.includes('voice')
  ) {
    return 'craft'
  }
  if (
    id.includes('analyze') ||
    id.includes('split') ||
    id === 'story_to_script_run' ||
    id === 'script_to_storyboard_run'
  ) {
    return 'understand'
  }
  if (id.includes('check') || id.includes('review') || id.includes('verify')) {
    return 'check'
  }
  return 'craft'
}

export function resolveAgentActivityFeed(
  stages: readonly ActivityFeedStageInput[],
): ActivityFeedItem[] {
  return stages.map((stage) => ({
    id: stage.id,
    layer: resolveActivityFeedLayer(stage.id),
    title: stage.title,
    status: normalizeFeedStatus(stage.status),
    subtitle: stage.subtitle,
    retryable: stage.retryable !== false,
  }))
}
