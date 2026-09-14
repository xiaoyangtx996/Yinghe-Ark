'use client'

import { apiFetch } from '@/lib/api-fetch'
import { selectRecoverableRun } from '@/lib/run-runtime/recovery'

type ActiveRunResolverArgs = {
  projectId: string
  storageScopeKey?: string
  workflowType: string
}

/**
 * Shared active-run lookup for recovery probes.
 * Throws on transport/HTTP failure so the probe can distinguish errors from "no run".
 */
export async function resolveActiveRunIdForWorkflow({
  projectId,
  storageScopeKey,
  workflowType,
}: ActiveRunResolverArgs): Promise<string | null> {
  if (!storageScopeKey) return null

  const search = new URLSearchParams({
    projectId,
    workflowType,
    targetType: 'NovelPromotionEpisode',
    targetId: storageScopeKey,
    episodeId: storageScopeKey,
    limit: '20',
  })
  search.append('status', 'queued')
  search.append('status', 'running')
  search.append('status', 'canceling')
  search.set('_v', '2')

  const response = await apiFetch(`/api/runs?${search.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`active run lookup failed: ${response.status}`)
  }

  const data = await response.json().catch(() => null)
  const runs = data && typeof data === 'object' && Array.isArray((data as { runs?: unknown[] }).runs)
    ? (data as {
      runs: Array<{
        id?: unknown
        status?: unknown
        createdAt?: unknown
        updatedAt?: unknown
        leaseExpiresAt?: unknown
        heartbeatAt?: unknown
      }>
    }).runs
    : []

  const decision = selectRecoverableRun(runs.map((run) => ({
    id: typeof run?.id === 'string' ? run.id : null,
    status: typeof run?.status === 'string' ? run.status : null,
    createdAt: typeof run?.createdAt === 'string' ? run.createdAt : null,
    updatedAt: typeof run?.updatedAt === 'string' ? run.updatedAt : null,
    leaseExpiresAt: typeof run?.leaseExpiresAt === 'string' ? run.leaseExpiresAt : null,
    heartbeatAt: typeof run?.heartbeatAt === 'string' ? run.heartbeatAt : null,
  })))
  return decision.runId
}
