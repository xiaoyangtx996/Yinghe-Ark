'use client'

import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'

export type EpisodeDataView = 'full' | 'script' | 'panels'

/** storyboard/videos need signed panel media; voice needs lean panels; else clips-only script. */
export function resolveEpisodeDataView(stage?: string | null): EpisodeDataView {
  if (stage === 'storyboard' || stage === 'video' || stage === 'videos') return 'full'
  if (stage === 'voice') return 'panels'
  return 'script'
}

export function setEpisodeQueryData(
  queryClient: QueryClient,
  projectId: string,
  episodeId: string,
  updater: (previous: unknown) => unknown,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeys.episodeData(projectId, episodeId) },
    updater,
  )
}

export function getEpisodeQueryData<T>(
  queryClient: QueryClient,
  projectId: string,
  episodeId: string,
  preferredView: EpisodeDataView = 'full',
): T | undefined {
  const preferred = queryClient.getQueryData<T>(
    queryKeys.episodeData(projectId, episodeId, preferredView),
  )
  if (preferred !== undefined) return preferred
  const order: EpisodeDataView[] =
    preferredView === 'full'
      ? ['full', 'panels', 'script']
      : preferredView === 'panels'
        ? ['panels', 'full', 'script']
        : ['script', 'panels', 'full']
  for (const view of order) {
    if (view === preferredView) continue
    const hit = queryClient.getQueryData<T>(
      queryKeys.episodeData(projectId, episodeId, view),
    )
    if (hit !== undefined) return hit
  }
  return undefined
}

export function snapshotEpisodeQueries(
  queryClient: QueryClient,
  projectId: string,
  episodeId: string,
): Array<[QueryKey, unknown]> {
  return queryClient.getQueriesData({
    queryKey: queryKeys.episodeData(projectId, episodeId),
  })
}

export function restoreEpisodeSnapshots(
  queryClient: QueryClient,
  snapshots: Array<[QueryKey, unknown]> | null | undefined,
) {
  if (!snapshots) return
  for (const [queryKey, data] of snapshots) {
    queryClient.setQueryData(queryKey, data)
  }
}
