'use client'

import { useMemo } from 'react'
import { useActiveTasks } from '@/lib/query/hooks/useTaskStatus'
import {
  PIPELINE_VIDEO_TASK_TYPES,
  PIPELINE_VOICE_TASK_TYPES,
  isPipelineMediaTaskForEpisode,
} from '@/lib/task/pipeline-checklist'

/**
 * Project-level active video/voice tasks that should light the pipeline checklist
 * (and optional capsule "processing" state) for the current episode.
 */
export function usePipelineMediaTaskActivity(projectId: string, episodeId?: string | null) {
  const videoQuery = useActiveTasks({
    projectId,
    type: [...PIPELINE_VIDEO_TASK_TYPES],
    enabled: !!projectId,
  })
  const voiceQuery = useActiveTasks({
    projectId,
    type: [...PIPELINE_VOICE_TASK_TYPES],
    enabled: !!projectId,
  })

  const videoRunning = useMemo(
    () => (videoQuery.data || []).some((task) => isPipelineMediaTaskForEpisode(task, episodeId)),
    [episodeId, videoQuery.data],
  )

  const voiceRunning = useMemo(
    () => (voiceQuery.data || []).some((task) => isPipelineMediaTaskForEpisode(task, episodeId)),
    [episodeId, voiceQuery.data],
  )

  return {
    videoRunning,
    voiceRunning,
    mediaRunning: videoRunning || voiceRunning,
  }
}
