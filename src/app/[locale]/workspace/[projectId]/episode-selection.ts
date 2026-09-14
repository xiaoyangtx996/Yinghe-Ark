export interface EpisodeLike {
  id: string
  episodeNumber?: number
}

/**
 * Resolve which episode should be active.
 * URL wins when valid; otherwise pick the latest episode (highest episodeNumber),
 * falling back to the last list item.
 */
export function resolveSelectedEpisodeId(
  episodes: ReadonlyArray<EpisodeLike>,
  urlEpisodeId: string | null,
): string | null {
  if (episodes.length === 0) return null
  if (urlEpisodeId && episodes.some((episode) => episode.id === urlEpisodeId)) {
    return urlEpisodeId
  }

  let latest = episodes[episodes.length - 1]
  for (const episode of episodes) {
    if (typeof episode.episodeNumber !== 'number') continue
    if (typeof latest.episodeNumber !== 'number' || episode.episodeNumber > latest.episodeNumber) {
      latest = episode
    }
  }
  return latest.id
}
