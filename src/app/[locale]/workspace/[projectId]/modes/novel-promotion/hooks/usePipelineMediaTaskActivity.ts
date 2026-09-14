'use client'

import { useMemo } from 'react'
import { useActiveTasks } from '@/lib/query/hooks/useTaskStatus'
import {
  PIPELINE_VIDEO_TASK_TYPES,
  PIPELINE_VOICE_TASK_TYPES,
  isPipelineMediaTaskForEpisode,
} from '@/lib/task/pipeline-checklist'

const PIPELINE_MEDIA_TASK_TYPES = [
  ...PIPELINE_VIDEO_TASK_TYPES,
  ...PIPELINE_VOICE_TASK_TYPES,
] as string[]

const VIDEO_TYPE_SET = new Set<string>(PIPELINE_VIDEO_TASK_TYPES)
const VOICE_TYPE_SET = new Set<string>(PIPELINE_VOICE_TASK_TYPES)

/**
 * Project-level active video/voice tasks that should light the pipeline checklist
 * (and optional capsule "processing" state) for the current episode.
 *
 * One /api/tasks round-trip (both types); split client-side for checklist flags.
 */
export function usePipelineMediaTaskActivity(projectId: string, episodeId?: string | null) {
  const mediaQuery = useActiveTasks({
    projectId,
    type: PIPELINE_MEDIA_TASK_TYPES,
    enabled: !!projectId,
  })

  const { videoRunning, voiceRunning } = useMemo(() => {
    const tasks = mediaQuery.data || []
    let video = false
    let voice = false
    for (const task of tasks) {
      if (!isPipelineMediaTaskForEpisode(task, episodeId)) continue
      if (!video && VIDEO_TYPE_SET.has(task.type)) video = true
      if (!voice && VOICE_TYPE_SET.has(task.type)) voice = true
      if (video && voice) break
    }
    return { videoRunning: video, voiceRunning: voice }
  }, [episodeId, mediaQuery.data])

  return {
    videoRunning,
    voiceRunning,
    mediaRunning: videoRunning || voiceRunning,
  }
}
