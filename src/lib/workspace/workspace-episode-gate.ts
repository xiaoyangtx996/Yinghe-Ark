/**
 * Workspace zero-state must trust shell episodeCount so a slow index
 * never flashes the import wizard on a non-empty project.
 */
export function resolveWorkspaceHasEpisodes(opts: {
  episodeCount?: number | null
  indexLength: number
}): boolean {
  const count = opts.episodeCount
  if (typeof count === 'number' && Number.isFinite(count)) {
    return count > 0
  }
  return opts.indexLength > 0
}
