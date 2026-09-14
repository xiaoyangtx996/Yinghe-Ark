import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ProjectListStats = {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
  coverImageUrl: string | null
}

type PanelAggRow = {
  projectId: string
  panels: bigint | number
  images: bigint | number
  videos: bigint | number
}

type PreviewRow = {
  projectId: string
  preview: string | null
}

type CoverRow = {
  projectId: string
  imageUrl: string | null
}

function toCount(value: bigint | number | null | undefined): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return 0
}

export function buildEmptyProjectListStats(
  firstEpisodePreview: string | null = null,
): ProjectListStats {
  return {
    episodes: 0,
    images: 0,
    videos: 0,
    panels: 0,
    firstEpisodePreview,
    coverImageUrl: null,
  }
}

/**
 * Load list-card stats without nested panel URL materialization.
 * Counts / preview / cover via SQL aggregates (no LongText full-row pull, no N findFirst).
 */
export async function loadProjectListStats(projectIds: string[]): Promise<{
  statsMap: Map<string, ProjectListStats>
  genrePackMap: Map<string, string | null>
}> {
  const statsMap = new Map<string, ProjectListStats>()
  const genrePackMap = new Map<string, string | null>()

  if (projectIds.length === 0) {
    return { statsMap, genrePackMap }
  }

  const idList = Prisma.join(projectIds)

  const [novelProjects, panelAggs, previewRows, coverRows] = await Promise.all([
    prisma.novelPromotionProject.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        projectId: true,
        genrePack: true,
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    }),
    prisma.$queryRaw<PanelAggRow[]>`
      SELECT
        np.projectId AS projectId,
        COUNT(p.id) AS panels,
        COALESCE(SUM(CASE WHEN p.imageUrl IS NOT NULL AND p.imageUrl != '' THEN 1 ELSE 0 END), 0) AS images,
        COALESCE(SUM(CASE WHEN p.videoUrl IS NOT NULL AND p.videoUrl != '' THEN 1 ELSE 0 END), 0) AS videos
      FROM novel_promotion_projects np
      LEFT JOIN novel_promotion_episodes e ON e.novelPromotionProjectId = np.id
      LEFT JOIN novel_promotion_storyboards sb ON sb.episodeId = e.id
      LEFT JOIN novel_promotion_panels p ON p.storyboardId = sb.id
      WHERE np.projectId IN (${idList})
      GROUP BY np.projectId
    `,
    prisma.$queryRaw<PreviewRow[]>`
      SELECT
        np.projectId AS projectId,
        SUBSTRING(e.novelText, 1, 100) AS preview
      FROM novel_promotion_episodes e
      INNER JOIN novel_promotion_projects np ON np.id = e.novelPromotionProjectId
      WHERE e.episodeNumber = 1
        AND np.projectId IN (${idList})
    `,
    prisma.$queryRaw<CoverRow[]>`
      SELECT projectId, imageUrl FROM (
        SELECT
          np.projectId AS projectId,
          p.imageUrl AS imageUrl,
          ROW_NUMBER() OVER (
            PARTITION BY np.projectId
            ORDER BY e.episodeNumber ASC, sb.createdAt ASC, p.panelIndex ASC
          ) AS rn
        FROM novel_promotion_projects np
        INNER JOIN novel_promotion_episodes e ON e.novelPromotionProjectId = np.id
        INNER JOIN novel_promotion_storyboards sb ON sb.episodeId = e.id
        INNER JOIN novel_promotion_panels p ON p.storyboardId = sb.id
        WHERE np.projectId IN (${idList})
          AND p.imageUrl IS NOT NULL
          AND p.imageUrl != ''
      ) ranked
      WHERE rn = 1
    `,
  ])

  const previewMap = new Map(
    previewRows.map((row) => [
      row.projectId,
      row.preview && String(row.preview).trim() ? String(row.preview) : null,
    ]),
  )
  const coverMap = new Map(
    coverRows.map((row) => [row.projectId, row.imageUrl ?? null]),
  )
  const aggMap = new Map(
    panelAggs.map((row) => [
      row.projectId,
      {
        panels: toCount(row.panels),
        images: toCount(row.images),
        videos: toCount(row.videos),
      },
    ]),
  )

  for (const np of novelProjects) {
    const agg = aggMap.get(np.projectId)
    genrePackMap.set(np.projectId, np.genrePack ?? null)
    statsMap.set(np.projectId, {
      episodes: np._count.episodes,
      images: agg?.images ?? 0,
      videos: agg?.videos ?? 0,
      panels: agg?.panels ?? 0,
      firstEpisodePreview: previewMap.get(np.projectId) ?? null,
      coverImageUrl: coverMap.get(np.projectId) ?? null,
    })
  }

  return { statsMap, genrePackMap }
}
