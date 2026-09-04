import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api-errors'

export type ProjectOwnedEpisodeRef = {
  novelPromotionProject: { projectId: string }
}

export type ProjectOwnedViaEpisodeRef = {
  episode: ProjectOwnedEpisodeRef
}

/** Prisma include fragment used by merge / review / storyboard-group. */
export const EPISODE_PROJECT_OWNERSHIP_INCLUDE = {
  novelPromotionProject: { select: { projectId: true as const } },
} as const

export const STORYBOARD_PROJECT_OWNERSHIP_INCLUDE = {
  episode: { include: EPISODE_PROJECT_OWNERSHIP_INCLUDE },
} as const

export const PANEL_PROJECT_OWNERSHIP_INCLUDE = {
  storyboard: { include: STORYBOARD_PROJECT_OWNERSHIP_INCLUDE },
} as const

export const CLIP_PROJECT_OWNERSHIP_INCLUDE = {
  episode: { include: EPISODE_PROJECT_OWNERSHIP_INCLUDE },
} as const

export function isEpisodeOwnedByProject(
  episode: ProjectOwnedEpisodeRef | null | undefined,
  projectId: string,
): boolean {
  return !!episode && episode.novelPromotionProject.projectId === projectId
}

export function isResourceOwnedViaEpisode(
  resource: ProjectOwnedViaEpisodeRef | null | undefined,
  projectId: string,
): boolean {
  return !!resource && isEpisodeOwnedByProject(resource.episode, projectId)
}

export function assertEpisodeOwnedByProject(
  episode: ProjectOwnedEpisodeRef | null | undefined,
  projectId: string,
): asserts episode is ProjectOwnedEpisodeRef {
  if (!isEpisodeOwnedByProject(episode, projectId)) {
    throw new ApiError('NOT_FOUND')
  }
}

export function assertResourceOwnedViaEpisode(
  resource: ProjectOwnedViaEpisodeRef | null | undefined,
  projectId: string,
): asserts resource is ProjectOwnedViaEpisodeRef {
  if (!isResourceOwnedViaEpisode(resource, projectId)) {
    throw new ApiError('NOT_FOUND')
  }
}

export async function requireEpisodeOwnedByProject(episodeId: string, projectId: string) {
  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
    include: EPISODE_PROJECT_OWNERSHIP_INCLUDE,
  })
  assertEpisodeOwnedByProject(episode, projectId)
  return episode
}

export async function requireClipOwnedByProject(clipId: string, projectId: string) {
  const clip = await prisma.novelPromotionClip.findUnique({
    where: { id: clipId },
    include: CLIP_PROJECT_OWNERSHIP_INCLUDE,
  })
  assertResourceOwnedViaEpisode(clip, projectId)
  return clip
}

export async function requireStoryboardOwnedByProject(storyboardId: string, projectId: string) {
  const storyboard = await prisma.novelPromotionStoryboard.findUnique({
    where: { id: storyboardId },
    include: STORYBOARD_PROJECT_OWNERSHIP_INCLUDE,
  })
  assertResourceOwnedViaEpisode(storyboard, projectId)
  return storyboard
}

export async function requirePanelOwnedByProject(panelId: string, projectId: string) {
  const panel = await prisma.novelPromotionPanel.findUnique({
    where: { id: panelId },
    include: PANEL_PROJECT_OWNERSHIP_INCLUDE,
  })
  if (!panel || !isResourceOwnedViaEpisode(panel.storyboard, projectId)) {
    throw new ApiError('NOT_FOUND')
  }
  return panel
}
