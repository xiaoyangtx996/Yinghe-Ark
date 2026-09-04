export type PipelineChecklistStatus = 'done' | 'active' | 'pending'

export type PipelineChecklistItem = {
  id: 'story' | 'script' | 'storyboard' | 'video' | 'voice'
  status: PipelineChecklistStatus
}

export type PipelineChecklistInput = {
  artifacts: {
    hasStory: boolean
    hasScript: boolean
    hasStoryboard: boolean
    hasVideo: boolean
    hasVoice: boolean
  }
  storyToScriptRunning: boolean
  scriptToStoryboardRunning: boolean
  videoRunning?: boolean
  voiceRunning?: boolean
}

export const PIPELINE_VIDEO_TASK_TYPES = ['video_panel'] as const
export const PIPELINE_VOICE_TASK_TYPES = ['voice_line'] as const

/**
 * Whether an active media task should light up the checklist for the current episode.
 * Tasks without episodeId are treated as project-scoped and count for any episode.
 */
export function isPipelineMediaTaskForEpisode(
  task: { episodeId?: string | null },
  episodeId?: string | null,
): boolean {
  if (!episodeId) return true
  if (!task.episodeId) return true
  return task.episodeId === episodeId
}

/**
 * Build a beginner-readable pipeline checklist from artifact readiness + active runs.
 */
export function resolvePipelineChecklist(input: PipelineChecklistInput): PipelineChecklistItem[] {
  const { artifacts } = input

  const scriptStatus: PipelineChecklistStatus = artifacts.hasScript
    ? 'done'
    : input.storyToScriptRunning
      ? 'active'
      : 'pending'

  const storyboardStatus: PipelineChecklistStatus = artifacts.hasStoryboard
    ? 'done'
    : input.scriptToStoryboardRunning
      ? 'active'
      : 'pending'

  const videoStatus: PipelineChecklistStatus = artifacts.hasVideo
    ? 'done'
    : input.videoRunning
      ? 'active'
      : 'pending'

  const voiceStatus: PipelineChecklistStatus = artifacts.hasVoice
    ? 'done'
    : input.voiceRunning
      ? 'active'
      : 'pending'

  return [
    { id: 'story', status: artifacts.hasStory ? 'done' : 'pending' },
    { id: 'script', status: scriptStatus },
    { id: 'storyboard', status: storyboardStatus },
    { id: 'video', status: videoStatus },
    { id: 'voice', status: voiceStatus },
  ]
}

export function shouldShowPipelineChecklist(input: {
  items: PipelineChecklistItem[]
  storyToScriptRunning: boolean
  scriptToStoryboardRunning: boolean
  showCreatingToast?: boolean
}): boolean {
  if (input.showCreatingToast) return true
  if (input.storyToScriptRunning || input.scriptToStoryboardRunning) return true
  return input.items.some((item) => item.status === 'active')
}
