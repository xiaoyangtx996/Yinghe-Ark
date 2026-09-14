'use client'

import { useRunStreamState, type RunResult } from './useRunStreamState'
import { TASK_TYPE } from '@/lib/task/types'
import { resolveActiveRunIdForWorkflow } from './run-stream/resolve-active-run'

export type ScriptToStoryboardRunParams = {
  episodeId: string
  model?: string
  temperature?: number
  reasoning?: boolean
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export type ScriptToStoryboardRunResult = RunResult

type UseScriptToStoryboardRunStreamOptions = {
  projectId: string
  episodeId?: string | null
  recoveryEnabled?: boolean
}

export function useScriptToStoryboardRunStream({
  projectId,
  episodeId,
  recoveryEnabled = true,
}: UseScriptToStoryboardRunStreamOptions) {
  return useRunStreamState<ScriptToStoryboardRunParams>({
    projectId,
    endpoint: (pid) => `/api/novel-promotion/${pid}/script-to-storyboard-stream`,
    storageKeyPrefix: 'novel-promotion:script-to-storyboard-run',
    storageScopeKey: episodeId || undefined,
    recoveryEnabled,
    resolveActiveRunId: ({ projectId: pid, storageScopeKey }) =>
      resolveActiveRunIdForWorkflow({
        projectId: pid,
        storageScopeKey,
        workflowType: TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
      }),
    validateParams: (params) => {
      if (!params.episodeId) {
        throw new Error('episodeId is required')
      }
    },
    buildRequestBody: (params) => ({
      episodeId: params.episodeId,
      model: params.model || undefined,
      temperature: params.temperature,
      reasoning: params.reasoning,
      reasoningEffort: params.reasoningEffort,
      async: true,
      displayMode: 'detail',
    }),
  })
}
