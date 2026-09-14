'use client'

const PROBE_SUCCESS_COOLDOWN_MS = 60_000
/** Short retries only cover mount races; idle pages must not poll forever. */
const PROBE_RETRY_INTERVAL_MS = 2_000
const PROBE_EMPTY_MAX_ATTEMPTS = 2
const PROBE_ERROR_RETRY_MS = 5_000
const successfulProbeScopes = new Map<string, number>()

type RecoveryProbeContext = {
  projectId: string
  storageScopeKey?: string
}

type StartRecoveryProbeArgs = {
  projectId: string
  storageKey: string
  storageScopeKey?: string
  hasRunState: () => boolean
  resolveActiveRunId: (context: RecoveryProbeContext) => Promise<string | null>
  onRecovered: (runId: string) => void
}

function scheduleProbe(
  callback: () => void,
  delayMs: number,
): ReturnType<typeof setTimeout> {
  return globalThis.setTimeout(callback, delayMs)
}

export function startRecoveryProbe(args: StartRecoveryProbeArgs): () => void {
  let cancelled = false
  let emptyAttempts = 0
  let errorAttempts = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const clearRetryTimer = () => {
    if (retryTimer) {
      globalThis.clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const scheduleRetry = (delayMs: number) => {
    if (cancelled || args.hasRunState()) return
    clearRetryTimer()
    retryTimer = scheduleProbe(() => {
      void probe()
    }, delayMs)
  }

  const probe = async () => {
    if (cancelled || args.hasRunState()) return

    const lastSuccessAt = successfulProbeScopes.get(args.storageKey)
    if (lastSuccessAt) {
      const cooldownRemainingMs =
        PROBE_SUCCESS_COOLDOWN_MS - (Date.now() - lastSuccessAt)
      if (cooldownRemainingMs > 0) {
        scheduleRetry(cooldownRemainingMs)
        return
      }
    }

    let probeFailed = false
    const activeRunId = await args.resolveActiveRunId({
      projectId: args.projectId,
      storageScopeKey: args.storageScopeKey,
    }).catch(() => {
      probeFailed = true
      return null
    })

    if (cancelled || args.hasRunState()) return

    if (probeFailed) {
      errorAttempts += 1
      scheduleRetry(
        errorAttempts >= PROBE_EMPTY_MAX_ATTEMPTS
          ? PROBE_SUCCESS_COOLDOWN_MS
          : PROBE_ERROR_RETRY_MS,
      )
      return
    }

    errorAttempts = 0

    if (!activeRunId) {
      emptyAttempts += 1
      if (emptyAttempts < PROBE_EMPTY_MAX_ATTEMPTS) {
        scheduleRetry(PROBE_RETRY_INTERVAL_MS)
        return
      }
      // Exhausted idle budget — cool down so remount/Strict Mode does not re-burn attempts.
      successfulProbeScopes.set(args.storageKey, Date.now())
      return
    }

    successfulProbeScopes.set(args.storageKey, Date.now())
    args.onRecovered(activeRunId)
  }

  // Defer first probe so React Strict Mode's effect remount cancels before network I/O.
  retryTimer = scheduleProbe(() => {
    retryTimer = null
    void probe()
  }, 0)

  return () => {
    cancelled = true
    clearRetryTimer()
  }
}

export const recoveryProbeTestUtils = {
  clearSuccessfulProbeScopes() {
    successfulProbeScopes.clear()
  },
  PROBE_RETRY_INTERVAL_MS,
  PROBE_SUCCESS_COOLDOWN_MS,
  PROBE_EMPTY_MAX_ATTEMPTS,
  PROBE_ERROR_RETRY_MS,
}
