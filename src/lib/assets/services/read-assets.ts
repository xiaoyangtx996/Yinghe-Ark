import { prisma } from '@/lib/prisma'
import { attachMediaFieldsToGlobalCharacter, attachMediaFieldsToGlobalLocation, attachMediaFieldsToGlobalVoice, attachMediaFieldsToProject } from '@/lib/media/attach'
import {
  filterAssetsByKind as filterMappedAssetsByKind,
  mapGlobalCharacterToAsset,
  mapGlobalLocationToAsset,
  mapGlobalPropToAsset,
  mapGlobalVoiceToAsset,
  mapProjectCharacterToAsset,
  mapProjectLocationToAsset,
  mapProjectPropToAsset,
} from '@/lib/assets/mappers'
import type { AssetKind, AssetQueryInput, AssetSummary } from '@/lib/assets/contracts'
import {
  listGlobalLocationBackedAssets,
  listProjectLocationBackedAssets,
} from '@/lib/assets/services/location-backed-assets'

async function readProjectAssets(
  projectId: string,
  kind?: AssetKind | null,
): Promise<AssetSummary[]> {
  const needCharacters = !kind || kind === 'character'
  const needLocations = !kind || kind === 'location'
  const needProps = !kind || kind === 'prop'

  const project = await prisma.novelPromotionProject.findUnique({
    where: { projectId },
    select: {
      id: true,
      characters: needCharacters
        ? {
            include: {
              appearances: {
                orderBy: { appearanceIndex: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          }
        : false,
    },
  })
  if (!project) {
    return []
  }

  const [locations, props] = await Promise.all([
    needLocations ? listProjectLocationBackedAssets(project.id, 'location') : Promise.resolve([]),
    needProps ? listProjectLocationBackedAssets(project.id, 'prop') : Promise.resolve([]),
  ])

  const withMedia = await attachMediaFieldsToProject({
    characters: needCharacters ? (project.characters || []) : [],
    locations: [...locations, ...props],
  })
  const projectCharacters = needCharacters
    ? (withMedia.characters as unknown as Parameters<typeof mapProjectCharacterToAsset>[0][])
      .map(mapProjectCharacterToAsset)
    : []
  const locationLikeAssets = withMedia.locations as Array<Record<string, unknown> & { assetKind?: string }>
  const projectLocations = needLocations
    ? locationLikeAssets
      .filter((asset) => asset.assetKind === 'location')
      .map((asset) => mapProjectLocationToAsset(asset as Parameters<typeof mapProjectLocationToAsset>[0]))
    : []
  const projectProps = needProps
    ? locationLikeAssets
      .filter((asset) => asset.assetKind === 'prop')
      .map((asset) => mapProjectPropToAsset(asset as Parameters<typeof mapProjectPropToAsset>[0]))
    : []
  return [...projectCharacters, ...projectLocations, ...projectProps]
}

async function readGlobalAssets(input: {
  folderId?: string | null
  userId: string
  kind?: AssetKind | null
}): Promise<AssetSummary[]> {
  const folderFilter = input.folderId ? { folderId: input.folderId } : {}
  const where = {
    userId: input.userId,
    ...folderFilter,
  }
  const kind = input.kind
  const needCharacters = !kind || kind === 'character'
  const needLocations = !kind || kind === 'location'
  const needProps = !kind || kind === 'prop'
  const needVoices = !kind || kind === 'voice'

  const [characters, locations, props, voices] = await Promise.all([
    needCharacters
      ? prisma.globalCharacter.findMany({
          where,
          include: {
            appearances: {
              orderBy: { appearanceIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
    needLocations
      ? listGlobalLocationBackedAssets({
          userId: input.userId,
          folderId: input.folderId,
          kind: 'location',
        })
      : Promise.resolve([]),
    needProps
      ? listGlobalLocationBackedAssets({
          userId: input.userId,
          folderId: input.folderId,
          kind: 'prop',
        })
      : Promise.resolve([]),
    needVoices
      ? prisma.globalVoice.findMany({
          where,
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
  ])

  const [globalCharacters, globalLocations, globalProps, globalVoices] = await Promise.all([
    Promise.all(characters.map((character) => attachMediaFieldsToGlobalCharacter(character))),
    Promise.all(locations.map((location) => attachMediaFieldsToGlobalLocation(location))),
    Promise.all(props.map((prop) => attachMediaFieldsToGlobalLocation(prop))),
    Promise.all(voices.map((voice) => attachMediaFieldsToGlobalVoice(voice))),
  ])

  return [
    ...(globalCharacters as unknown as Parameters<typeof mapGlobalCharacterToAsset>[0][]).map(mapGlobalCharacterToAsset),
    ...(globalLocations as unknown as Parameters<typeof mapGlobalLocationToAsset>[0][]).map(mapGlobalLocationToAsset),
    ...(globalProps as unknown as Parameters<typeof mapGlobalPropToAsset>[0][]).map(mapGlobalPropToAsset),
    ...(globalVoices as unknown as Parameters<typeof mapGlobalVoiceToAsset>[0][]).map(mapGlobalVoiceToAsset),
  ]
}

export async function readAssets(
  input: AssetQueryInput,
  access?: { userId?: string | null },
): Promise<AssetSummary[]> {
  const kind = input.kind as AssetKind | null | undefined
  const assets = input.scope === 'project'
    ? await readProjectAssets(assertProjectId(input.projectId), kind)
    : await readGlobalAssets({
      folderId: input.folderId,
      userId: assertUserId(access?.userId),
      kind,
    })
  // Kind already applied at load time when set; keep filter for safety.
  return filterMappedAssetsByKind(assets, kind)
}

function assertProjectId(projectId: string | null | undefined): string {
  if (!projectId) {
    throw new Error('projectId is required for project asset scope')
  }
  return projectId
}

function assertUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw new Error('userId is required for global asset scope')
  }
  return userId
}
