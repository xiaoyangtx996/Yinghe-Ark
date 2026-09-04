export interface ProjectStatsLike {
  episodes: number
  images: number
  videos: number
  panels: number
}

export type ProjectStatsLabelFn = (key: 'episodes' | 'panels' | 'images' | 'videos', n: number) => string

/**
 * Build readable project stats chips, e.g. "1 集 · 9 镜 · 2 视频".
 * Prefer panels (镜) over raw image count when panels > 0.
 */
export function formatProjectStatsParts(
  stats: ProjectStatsLike | null | undefined,
  label: ProjectStatsLabelFn,
): string[] {
  if (!stats) return []
  const parts: string[] = []
  if (stats.episodes > 0) parts.push(label('episodes', stats.episodes))
  if (stats.panels > 0) parts.push(label('panels', stats.panels))
  else if (stats.images > 0) parts.push(label('images', stats.images))
  if (stats.videos > 0) parts.push(label('videos', stats.videos))
  return parts
}

export function formatProjectStatsLine(
  stats: ProjectStatsLike | null | undefined,
  label: ProjectStatsLabelFn,
  separator = ' · ',
): string | null {
  const parts = formatProjectStatsParts(stats, label)
  return parts.length > 0 ? parts.join(separator) : null
}
