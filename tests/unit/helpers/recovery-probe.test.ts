import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  recoveryProbeTestUtils,
  startRecoveryProbe,
} from '@/lib/query/hooks/run-stream/recovery-probe'

describe('recovery probe', () => {
  afterEach(() => {
    vi.useRealTimers()
    recoveryProbeTestUtils.clearSuccessfulProbeScopes()
  })

  it('retries active run recovery when the first probe misses and a later probe finds a run', async () => {
    vi.useFakeTimers()

    const resolveActiveRunId = vi
      .fn<({ projectId, storageScopeKey }: { projectId: string; storageScopeKey?: string }) => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('run-2')
    const onRecovered = vi.fn()

    const cleanup = startRecoveryProbe({
      projectId: 'project-1',
      storageKey: 'scope:story-to-script:episode-1',
      storageScopeKey: 'episode-1',
      hasRunState: () => false,
      resolveActiveRunId,
      onRecovered,
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(resolveActiveRunId).toHaveBeenCalledTimes(1)
    expect(resolveActiveRunId).toHaveBeenLastCalledWith({
      projectId: 'project-1',
      storageScopeKey: 'episode-1',
    })
    expect(onRecovered).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(
      recoveryProbeTestUtils.PROBE_RETRY_INTERVAL_MS,
    )

    expect(resolveActiveRunId).toHaveBeenCalledTimes(2)
    expect(onRecovered).toHaveBeenCalledTimes(1)
    expect(onRecovered).toHaveBeenCalledWith('run-2')

    cleanup()
  })

  it('stops probing after empty attempts are exhausted', async () => {
    vi.useFakeTimers()

    const resolveActiveRunId = vi.fn(async () => null)
    const onRecovered = vi.fn()

    const cleanup = startRecoveryProbe({
      projectId: 'project-1',
      storageKey: 'scope:story-to-script:episode-1',
      storageScopeKey: 'episode-1',
      hasRunState: () => false,
      resolveActiveRunId,
      onRecovered,
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(
      recoveryProbeTestUtils.PROBE_RETRY_INTERVAL_MS * 5,
    )

    expect(resolveActiveRunId).toHaveBeenCalledTimes(
      recoveryProbeTestUtils.PROBE_EMPTY_MAX_ATTEMPTS,
    )
    expect(onRecovered).not.toHaveBeenCalled()

    cleanup()
  })

  it('does not consume empty budget on transport errors', async () => {
    vi.useFakeTimers()

    const resolveActiveRunId = vi
      .fn<({ projectId, storageScopeKey }: { projectId: string; storageScopeKey?: string }) => Promise<string | null>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('run-recovered')
    const onRecovered = vi.fn()

    const cleanup = startRecoveryProbe({
      projectId: 'project-1',
      storageKey: 'scope:story-to-script:episode-1',
      storageScopeKey: 'episode-1',
      hasRunState: () => false,
      resolveActiveRunId,
      onRecovered,
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(recoveryProbeTestUtils.PROBE_ERROR_RETRY_MS)
    await vi.advanceTimersByTimeAsync(recoveryProbeTestUtils.PROBE_SUCCESS_COOLDOWN_MS)

    expect(onRecovered).toHaveBeenCalledWith('run-recovered')
    cleanup()
  })

  it('cools down after empty budget so a remount does not immediately re-probe', async () => {
    vi.useFakeTimers()

    const resolveActiveRunId = vi.fn(async () => null)
    const onRecovered = vi.fn()

    const cleanup1 = startRecoveryProbe({
      projectId: 'project-1',
      storageKey: 'scope:story-to-script:episode-1',
      storageScopeKey: 'episode-1',
      hasRunState: () => false,
      resolveActiveRunId,
      onRecovered,
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(
      recoveryProbeTestUtils.PROBE_RETRY_INTERVAL_MS,
    )
    cleanup1()

    expect(resolveActiveRunId).toHaveBeenCalledTimes(
      recoveryProbeTestUtils.PROBE_EMPTY_MAX_ATTEMPTS,
    )

    const cleanup2 = startRecoveryProbe({
      projectId: 'project-1',
      storageKey: 'scope:story-to-script:episode-1',
      storageScopeKey: 'episode-1',
      hasRunState: () => false,
      resolveActiveRunId,
      onRecovered,
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(
      recoveryProbeTestUtils.PROBE_RETRY_INTERVAL_MS,
    )

    // Still within empty-exhaust cooldown — no new resolve calls.
    expect(resolveActiveRunId).toHaveBeenCalledTimes(
      recoveryProbeTestUtils.PROBE_EMPTY_MAX_ATTEMPTS,
    )

    cleanup2()
  })

  it('cancels a deferred initial probe before it hits the network', async () => {
    vi.useFakeTimers()

    const resolveActiveRunId = vi.fn(async () => null)
    const onRecovered = vi.fn()

    const cleanup = startRecoveryProbe({
      projectId: 'project-1',
      storageKey: 'scope:story-to-script:episode-1',
      storageScopeKey: 'episode-1',
      hasRunState: () => false,
      resolveActiveRunId,
      onRecovered,
    })
    cleanup()

    await vi.advanceTimersByTimeAsync(0)
    expect(resolveActiveRunId).not.toHaveBeenCalled()
  })
})
