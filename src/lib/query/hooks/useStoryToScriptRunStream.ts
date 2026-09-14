'use client'

import { useRunStreamState, type RunResult } from './useRunStreamState'
import { TASK_TYPE } from '@/lib/task/types'
import { resolveActiveRunIdForWorkflow } from './run-stream/resolve-active-run'

export type StoryToScriptRunParams = {
  episodeId: string
  content: string
  model?: string
  temperature?: number
  reasoning?: boolean
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export type StoryToScriptRunResult = RunResult

type UseStoryToScriptRunStreamOptions = {
  projectId: string
  episodeId?: string | null
  recoveryEnabled?: boolean
}

export function useStoryToScriptRunStream({
  projectId,
  episodeId,
  recoveryEnabled = true,
}: UseStoryToScriptRunStreamOptions) {
  return useRunStreamState<StoryToScriptRunParams>({
    projectId,
    endpoint: (pid) => `/api/novel-promotion/${pid}/story-to-script-stream`,
    storageKeyPrefix: 'novel-promotion:story-to-script-run',
    storageScopeKey: episodeId || undefined,
    recoveryEnabled,
    resolveActiveRunId: ({ projectId: pid, storageScopeKey }) =>
      resolveActiveRunIdForWorkflow({
        projectId: pid,
        storageScopeKey,
        workflowType: TASK_TYPE.STORY_TO_SCRIPT_RUN,
      }),
    validateParams: (params) => {
      if (!params.episodeId) {
        throw new Error('episodeId is required')
      }
      if (!params.content.trim()) {
        throw new Error('content is required')
      }
    },
    buildRequestBody: (params) => ({
      episodeId: params.episodeId,
      content: params.content,
      model: params.model || undefined,
      temperature: params.temperature,
      reasoning: params.reasoning,
      reasoningEffort: params.reasoningEffort,
      async: true,
      displayMode: 'detail',
    }),
  })
}
