import type { QueryClient } from '@tanstack/react-query'
import {
  prefetchProjectData,
  prefetchEpisodeIndex,
  fetchEpisodeData,
} from '@/lib/query/hooks/useProjectData'
import { queryKeys } from '@/lib/query/keys'
import { prefetchNovelPromotionWorkspaceChunk } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/prefetch-workspace'
import {
  resolveLatestCompactEpisodeId,
  type CompactEpisodeIndex,
} from '@/lib/projects/episode-index'
import { EPISODE_INDEX_REMOTE_THRESHOLD } from '@/lib/projects/episode-index-query'

function pickDefaultEpisodeId(
  project: Awaited<ReturnType<typeof prefetchProjectData>>,
  compact: CompactEpisodeIndex | undefined,
): string | null {
  const novel = project.novelPromotionData as
    | { lastEpisodeId?: string | null; episodeCount?: number }
    | undefined
  if (!novel) return null
  if (typeof novel.lastEpisodeId === 'string' && novel.lastEpisodeId) {
    return novel.lastEpisodeId
  }
  if (!compact) return null
  return resolveLatestCompactEpisodeId(compact)
}

/** Warm shell (+ compact index when small), default episode (script view), and workspace JS chunk. */
export function prefetchProjectWorkspaceEntry(
  queryClient: QueryClient,
  projectId: string,
): void {
  void prefetchNovelPromotionWorkspaceChunk()
  void prefetchProjectData(queryClient, projectId).then(async (project) => {
    const count =
      (project.novelPromotionData as { episodeCount?: number } | undefined)?.episodeCount ?? 0
    const compact =
      count > 0 && count < EPISODE_INDEX_REMOTE_THRESHOLD
        ? await prefetchEpisodeIndex(queryClient, projectId)
        : undefined
    const episodeId = pickDefaultEpisodeId(project, compact)
    if (!episodeId) return
    void queryClient.prefetchQuery({
      queryKey: queryKeys.episodeData(projectId, episodeId, 'script'),
      queryFn: () => fetchEpisodeData(projectId, episodeId, 'script'),
      staleTime: 30_000,
    })
  })
}
