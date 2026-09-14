'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RunStreamEvent } from '@/lib/novel-promotion/run-stream/types'
import { applyRunStreamEvent } from './state-machine'
import { subscribeRecoveredRun } from './recovered-run-subscription'
import { executeRunRequest } from './run-request-executor'
import { deriveRunStreamView } from './run-stream-view'
import type { RunResult, RunState, RunStreamView, UseRunStreamStateOptions } from './types'
import { apiFetch } from '@/lib/api-fetch'
import { startRecoveryProbe } from './recovery-probe'

export type {
  RunResult,
  RunState,
  RunStepState,
  UseRunStreamStateOptions,
} from './types'

const TASK_STREAM_TIMEOUT_MS = 1000 * 60 * 30

export function useRunStreamState<TParams extends Record<string, unknown>>(
  options: UseRunStreamStateOptions<TParams>,
): RunStreamView {
  const {
    projectId,
    endpoint,
    storageKeyPrefix,
    storageScopeKey,
    recoveryEnabled = true,
    buildRequestBody,
    validateParams,
    resolveActiveRunId,
  } = options
  const [runState, setRunState] = useState<RunState | null>(null)
  const runStateRef = useRef<RunState | null>(null)
  const [clock, setClock] = useState(() => Date.now())
  const [isLiveRunning, setIsLiveRunning] = useState(false)
  const [isRecoveredRunning, setIsRecoveredRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const finalResultRef = useRef<RunResult | null>(null)
  const resolveActiveRunIdRef = useRef(resolveActiveRunId)
  const recoveredAfterSeqRef = useRef(0)
  const retryInFlightRef = useRef<Set<string>>(new Set())
  const storageKey = useMemo(() => {
    if (storageScopeKey) {
      return `${storageKeyPrefix}:${projectId}:${storageScopeKey}`
    }
    return `${storageKeyPrefix}:${projectId}`
  }, [projectId, storageKeyPrefix, storageScopeKey])

  const applyEvent = useCallback((event: RunStreamEvent) => {
    setRunState((prev) => applyRunStreamEvent(prev, event))
  }, [])

  useEffect(() => {
    runStateRef.current = runState
  }, [runState])

  useEffect(() => {
    resolveActiveRunIdRef.current = resolveActiveRunId
  }, [resolveActiveRunId])

  useEffect(() => {
    if (!recoveryEnabled || !projectId || !resolveActiveRunIdRef.current) return

    if (runStateRef.current) return

    return startRecoveryProbe({
      projectId,
      storageKey,
      storageScopeKey,
      hasRunState: () => runStateRef.current !== null,
      resolveActiveRunId: (context) =>
        resolveActiveRunIdRef.current?.(context) ?? Promise.resolve(null),
      onRecovered: (activeRunId) => {
        const now = Date.now()
        setRunState((prev) => {
          if (prev) return prev
          return {
            runId: activeRunId,
            status: 'running',
            startedAt: now,
            updatedAt: now,
            terminalAt: null,
            errorMessage: '',
            summary: null,
            payload: null,
            stepsById: {},
            stepOrder: [],
            activeStepId: null,
            selectedStepId: null,
          }
        })
        recoveredAfterSeqRef.current = 0
        setIsRecoveredRunning(true)
      },
    })
  }, [projectId, recoveryEnabled, storageKey, storageScopeKey])

  useEffect(() => {
    if (!projectId || !isRecoveredRunning || isLiveRunning) return
    const runId = runState?.runId || ''
    if (!runId || runState?.status !== 'running') return

    return subscribeRecoveredRun({
      runId,
      afterSeq: recoveredAfterSeqRef.current,
      taskStreamTimeoutMs: TASK_STREAM_TIMEOUT_MS,
      applyAndCapture: applyEvent,
      onSettled: () => {
        setIsRecoveredRunning(false)
      },
    })
  }, [
    applyEvent,
    isLiveRunning,
    isRecoveredRunning,
    projectId,
    runState?.runId,
    runState?.status,
  ])

  useEffect(() => {
    if (!isRecoveredRunning) return
    if (!runState) {
      setIsRecoveredRunning(false)
      return
    }
    if (runState.status === 'completed' || runState.status === 'failed') {
      setIsRecoveredRunning(false)
    }
  }, [isRecoveredRunning, runState, runState?.status])

  const run = useCallback(
    async (params: TParams): Promise<RunResult> => {
      if (!projectId) {
        throw new Error('projectId is required')
      }
      validateParams?.(params)

      abortRef.current?.abort()
      setIsRecoveredRunning(false)
      recoveredAfterSeqRef.current = 0
      setIsLiveRunning(true)
      const controller = new AbortController()
      abortRef.current = controller
      finalResultRef.current = null

      try {
        const requestBody = buildRequestBody(params)
        return await executeRunRequest({
          endpointUrl: endpoint(projectId),
          requestBody,
          controller,
          taskStreamTimeoutMs: TASK_STREAM_TIMEOUT_MS,
          applyAndCapture: applyEvent,
          finalResultRef,
        })
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setIsLiveRunning(false)
      }
    },
    [
      applyEvent,
      buildRequestBody,
      endpoint,
      projectId,
      validateParams,
    ],
  )

  const retryStep = useCallback(async (params: {
    stepId: string
    modelOverride?: string
    reason?: string
  }): Promise<RunResult> => {
    const runId = runStateRef.current?.runId || ''
    if (!runId) {
      throw new Error('runId is required')
    }
    const stepId = params.stepId.trim()
    if (!stepId) {
      throw new Error('stepId is required')
    }
    if (retryInFlightRef.current.has(stepId)) {
      return {
        runId,
        status: 'running',
        summary: null,
        payload: null,
        errorMessage: '',
      }
    }
    retryInFlightRef.current.add(stepId)

    try {
      const response = await apiFetch(
        `/api/runs/${runId}/steps/${encodeURIComponent(stepId)}/retry`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            modelOverride: params.modelOverride || undefined,
            reason: params.reason || undefined,
          }),
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const detailsCode =
          payload
          && typeof payload === 'object'
          && typeof (payload as { error?: { details?: { code?: unknown } } }).error?.details?.code === 'string'
            ? (payload as { error: { details: { code: string } } }).error.details.code
            : ''
        // Step already left FAILED (e.g. prior retry accepted) — treat as soft success.
        if (detailsCode === 'RUN_STEP_RETRY_ONLY_FAILED') {
          try {
            const snapshotResponse = await apiFetch(`/api/runs/${runId}`, {
              method: 'GET',
              cache: 'no-store',
            })
            if (snapshotResponse.ok) {
              const snapshot = await snapshotResponse.json().catch(() => null)
              const run =
                snapshot
                && typeof snapshot === 'object'
                && snapshot !== null
                  ? (snapshot as { run?: { lastSeq?: unknown; status?: unknown; errorMessage?: unknown; output?: unknown } }).run
                  : undefined
              const lastSeq =
                typeof run?.lastSeq === 'number'
                  ? Math.max(0, Math.floor(run.lastSeq))
                  : 0
              recoveredAfterSeqRef.current = lastSeq
              const remoteStatus = typeof run?.status === 'string' ? run.status : ''
              if (remoteStatus === 'completed') {
                applyEvent({
                  runId,
                  event: 'run.complete',
                  ts: new Date().toISOString(),
                  status: 'completed',
                  payload: run?.output && typeof run.output === 'object'
                    ? (run.output as Record<string, unknown>)
                    : null,
                })
                setIsRecoveredRunning(false)
                return {
                  runId,
                  status: 'completed',
                  summary: null,
                  payload: null,
                  errorMessage: '',
                }
              }
              if (remoteStatus === 'failed' || remoteStatus === 'canceled') {
                applyEvent({
                  runId,
                  event: 'run.error',
                  ts: new Date().toISOString(),
                  status: 'failed',
                  message: typeof run?.errorMessage === 'string' ? run.errorMessage : `run ${remoteStatus}`,
                })
                setIsRecoveredRunning(false)
                return {
                  runId,
                  status: 'failed',
                  summary: null,
                  payload: null,
                  errorMessage: typeof run?.errorMessage === 'string' ? run.errorMessage : `run ${remoteStatus}`,
                }
              }
            }
          } catch {
            // Fall through to reopen + recover.
          }
          applyEvent({
            runId,
            event: 'run.start',
            ts: new Date().toISOString(),
            status: 'running',
            message: 'retry already in progress',
          })
          setIsRecoveredRunning(true)
          return {
            runId,
            status: 'running',
            summary: null,
            payload: payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null,
            errorMessage: '',
          }
        }
        const errorMessage =
          payload && typeof payload === 'object' && typeof (payload as { error?: { message?: unknown } }).error?.message === 'string'
            ? (payload as { error: { message: string } }).error.message
            : 'retry step failed'
        throw new Error(errorMessage)
      }

      const retryAttemptRaw =
        payload
        && typeof payload === 'object'
        && typeof (payload as { retryAttempt?: unknown }).retryAttempt === 'number'
          ? (payload as { retryAttempt: number }).retryAttempt
          : NaN
      const retryAttempt = Number.isFinite(retryAttemptRaw)
        ? Math.max(1, Math.floor(retryAttemptRaw))
        : Math.max(
          1,
          (runStateRef.current?.stepsById[stepId]?.attempt || 1) + 1,
        )

      // Skip historical terminal events so recovery does not settle on the prior run.error.
      try {
        const snapshotResponse = await apiFetch(`/api/runs/${runId}`, {
          method: 'GET',
          cache: 'no-store',
        })
        if (snapshotResponse.ok) {
          const snapshot = await snapshotResponse.json().catch(() => null)
          const lastSeq =
            snapshot
            && typeof snapshot === 'object'
            && snapshot !== null
            && typeof (snapshot as { run?: { lastSeq?: unknown } }).run?.lastSeq === 'number'
              ? Math.max(0, Math.floor((snapshot as { run: { lastSeq: number } }).run.lastSeq))
              : 0
          recoveredAfterSeqRef.current = lastSeq
        }
      } catch {
        // Keep prior afterSeq; best-effort.
      }

      const existingStep = runStateRef.current?.stepsById[stepId]
      applyEvent({
        runId,
        event: 'run.start',
        ts: new Date().toISOString(),
        status: 'running',
        message: 'retrying failed step',
      })
      applyEvent({
        runId,
        event: 'step.start',
        ts: new Date().toISOString(),
        status: 'running',
        stepId,
        stepAttempt: retryAttempt,
        stepTitle: existingStep?.title,
        stepIndex: existingStep?.stepIndex,
        stepTotal: existingStep?.stepTotal,
        message: 'retrying failed step',
      })
      setIsRecoveredRunning(true)
      return {
        runId,
        status: 'running',
        summary: null,
        payload: payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null,
        errorMessage: '',
      }
    } finally {
      retryInFlightRef.current.delete(stepId)
    }
  }, [applyEvent])

  const stop = useCallback(() => {
    const runningRunId = runState?.status === 'running' ? runState.runId : ''
    if (runningRunId) {
      void apiFetch(`/api/runs/${runningRunId}/cancel`, {
        method: 'POST',
      }).catch(() => null)
      applyEvent({
        runId: runningRunId,
        event: 'run.error',
        ts: new Date().toISOString(),
        status: 'failed',
        message: 'aborted',
      })
    }
    abortRef.current?.abort()
    abortRef.current = null
    setIsLiveRunning(false)
  }, [applyEvent, runState?.runId, runState?.status])

  const reset = useCallback(() => {
    stop()
    setRunState(null)
    finalResultRef.current = null
    recoveredAfterSeqRef.current = 0
    retryInFlightRef.current.clear()
    setIsRecoveredRunning(false)
  }, [stop])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

  const view = useMemo(() => {
    return deriveRunStreamView({
      runState,
      isLiveRunning,
      clock,
    })
  }, [clock, isLiveRunning, runState])

  const selectStep = useCallback((stepId: string) => {
    setRunState((prev) => {
      if (!prev || !prev.stepsById[stepId]) return prev
      return {
        ...prev,
        selectedStepId: stepId,
      }
    })
  }, [])

  return {
    runState,
    runId: runState?.runId || '',
    status: runState?.status || 'idle',
    isRunning: isLiveRunning,
    isRecoveredRunning,
    isVisible: view.isVisible,
    errorMessage: runState?.errorMessage || '',
    summary: runState?.summary || null,
    payload: runState?.payload || null,
    stages: view.stages,
    orderedSteps: view.orderedSteps,
    activeStepId: view.activeStepId,
    selectedStep: view.selectedStep,
    outputText: view.outputText,
    overallProgress: view.overallProgress,
    activeMessage: view.activeMessage,
    run: run as (params: Record<string, unknown>) => Promise<RunResult>,
    retryStep,
    stop,
    reset,
    selectStep,
  }
}
