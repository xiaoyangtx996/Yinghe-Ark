import { decodeImageUrlsFromDb } from '@/lib/contracts/image-urls-contract'
import { toDisplayImageUrl } from '@/lib/media/image-url'
import {
  extractStorageKeyFromLegacyValue,
  prefetchMediaObjectsByIds,
  prefetchMediaObjectsByStorageKeys,
  resolveMediaRef,
  resolveMediaRefFromLegacyValue,
  runWithMediaResolveCache,
} from './service'
import type { MediaRef } from './types'

function pushMediaId(target: string[], value: unknown) {
  if (typeof value === 'string' && value.trim()) target.push(value.trim())
}

function pushLegacyStorageKeys(target: string[], value: unknown) {
  const key = extractStorageKeyFromLegacyValue(value)
  if (key) target.push(key)
}

function pushLegacyStorageKeysFromDbArray(target: string[], raw: unknown, fieldName: string) {
  if (raw == null) return
  if (typeof raw !== 'string') return
  for (const value of decodeImageUrlsFromDb(raw, fieldName)) {
    pushLegacyStorageKeys(target, value)
  }
}

/** Collect mediaObject ids referenced by a project-shaped payload (characters/locations/panels/…). */
export function collectProjectMediaIds(projectLike: Record<string, unknown>): string[] {
  const ids: string[] = []
  pushMediaId(ids, projectLike.audioMediaId)

  for (const character of (projectLike.characters as Array<Record<string, unknown>>) || []) {
    pushMediaId(ids, character.customVoiceMediaId)
    for (const appearance of (character.appearances as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, appearance.imageMediaId)
      pushMediaId(ids, appearance.previousImageMediaId)
    }
  }

  for (const location of (projectLike.locations as Array<Record<string, unknown>>) || []) {
    for (const img of (location.images as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, img.imageMediaId)
      pushMediaId(ids, img.previousImageMediaId)
    }
  }

  for (const prop of (projectLike.props as Array<Record<string, unknown>>) || []) {
    for (const img of (prop.images as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, img.imageMediaId)
      pushMediaId(ids, img.previousImageMediaId)
    }
  }

  for (const shot of (projectLike.shots as Array<Record<string, unknown>>) || []) {
    pushMediaId(ids, shot.imageMediaId)
  }

  for (const storyboard of (projectLike.storyboards as Array<Record<string, unknown>>) || []) {
    for (const panel of (storyboard.panels as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, panel.imageMediaId)
      pushMediaId(ids, panel.videoMediaId)
      pushMediaId(ids, panel.lipSyncVideoMediaId)
      pushMediaId(ids, panel.sketchImageMediaId)
      pushMediaId(ids, panel.previousImageMediaId)
    }
  }

  for (const line of (projectLike.voiceLines as Array<Record<string, unknown>>) || []) {
    pushMediaId(ids, line.audioMediaId)
  }

  return ids
}

/** Collect legacy storage keys (non-/m/ URLs/keys) for batch key: cache seeding. */
export function collectProjectLegacyStorageKeys(projectLike: Record<string, unknown>): string[] {
  const keys: string[] = []
  pushLegacyStorageKeys(keys, projectLike.audioUrl)

  for (const character of (projectLike.characters as Array<Record<string, unknown>>) || []) {
    pushLegacyStorageKeys(keys, character.customVoiceUrl)
    for (const appearance of (character.appearances as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, appearance.imageUrl)
      pushLegacyStorageKeys(keys, appearance.previousImageUrl)
      pushLegacyStorageKeysFromDbArray(keys, appearance.imageUrls, 'appearance.imageUrls')
      pushLegacyStorageKeysFromDbArray(keys, appearance.previousImageUrls, 'appearance.previousImageUrls')
    }
  }

  for (const location of (projectLike.locations as Array<Record<string, unknown>>) || []) {
    for (const img of (location.images as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, img.imageUrl)
      pushLegacyStorageKeys(keys, img.previousImageUrl)
    }
  }

  for (const prop of (projectLike.props as Array<Record<string, unknown>>) || []) {
    for (const img of (prop.images as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, img.imageUrl)
      pushLegacyStorageKeys(keys, img.previousImageUrl)
    }
  }

  for (const shot of (projectLike.shots as Array<Record<string, unknown>>) || []) {
    pushLegacyStorageKeys(keys, shot.imageUrl)
    pushLegacyStorageKeys(keys, shot.videoUrl)
  }

  for (const storyboard of (projectLike.storyboards as Array<Record<string, unknown>>) || []) {
    pushLegacyStorageKeys(keys, storyboard.storyboardImageUrl)
    for (const panel of (storyboard.panels as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, panel.imageUrl)
      pushLegacyStorageKeys(keys, panel.videoUrl)
      pushLegacyStorageKeys(keys, panel.lipSyncVideoUrl)
      pushLegacyStorageKeys(keys, panel.sketchImageUrl)
      pushLegacyStorageKeys(keys, panel.previousImageUrl)
      for (const candidate of parseStringArray(panel.candidateImages)) {
        pushLegacyStorageKeys(keys, candidate)
      }
    }
  }

  for (const line of (projectLike.voiceLines as Array<Record<string, unknown>>) || []) {
    pushLegacyStorageKeys(keys, line.audioUrl)
  }

  return keys
}

function asDisplayUrl(mediaUrl: string | null | undefined, legacy: unknown): string | null {
  if (mediaUrl) return mediaUrl
  if (typeof legacy !== 'string' || !legacy.trim()) return null
  if (legacy.startsWith('PENDING:')) return legacy
  return toDisplayImageUrl(legacy) || legacy
}

function parseStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

async function resolveAppearanceImageArray(raw: unknown, fieldName: string): Promise<{ urls: string[]; medias: MediaRef[] }> {
  const values = decodeImageUrlsFromDb(raw as string | null | undefined, fieldName)
  const refs = await Promise.all(values.map((value) => resolveMediaRefFromLegacyValue(value)))
  return {
    urls: values.map((value, index) => asDisplayUrl(refs[index]?.url, value) || value),
    medias: refs.filter((ref): ref is MediaRef => !!ref),
  }
}

async function attachMediaFieldsToAppearance<T extends Record<string, unknown>>(appearance: T) {
  const imageMedia = await resolveMediaRef(appearance.imageMediaId, appearance.imageUrl)
  const previousImageMedia = await resolveMediaRef(appearance.previousImageMediaId, appearance.previousImageUrl)
  const imageResult = await resolveAppearanceImageArray(appearance.imageUrls, 'appearance.imageUrls')
  const previousImageResult = await resolveAppearanceImageArray(appearance.previousImageUrls, 'appearance.previousImageUrls')

  return {
    ...appearance,
    imageMedia,
    media: imageMedia,
    previousImageMedia,
    imageMedias: imageResult.medias,
    previousImageMedias: previousImageResult.medias,
    imageUrl: asDisplayUrl(imageMedia?.url, appearance.imageUrl),
    previousImageUrl: asDisplayUrl(previousImageMedia?.url, appearance.previousImageUrl),
    imageUrls: imageResult.urls,
    previousImageUrls: previousImageResult.urls,
  }
}

export async function attachMediaFieldsToGlobalCharacter<T extends Record<string, unknown>>(character: T) {
  return runWithMediaResolveCache(async () => {
    const customVoiceMedia = await resolveMediaRef(character.customVoiceMediaId, character.customVoiceUrl)
    const appearances = await Promise.all(
      ((character.appearances as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToAppearance),
    )

    return {
      ...character,
      media: customVoiceMedia,
      customVoiceMedia,
      customVoiceUrl: customVoiceMedia?.url || character.customVoiceUrl || null,
      appearances,
    }
  })
}

export async function attachMediaFieldsToGlobalLocation<T extends Record<string, unknown>>(location: T) {
  return runWithMediaResolveCache(async () => {
    const images = await Promise.all(
      ((location.images as Array<Record<string, unknown>>) || []).map(async (img) => {
      const imageMedia = await resolveMediaRef(img.imageMediaId, img.imageUrl)
      const previousImageMedia = await resolveMediaRef(img.previousImageMediaId, img.previousImageUrl)
      return {
        ...img,
        media: imageMedia,
        imageMedia,
        previousImageMedia,
        imageUrl: asDisplayUrl(imageMedia?.url, img.imageUrl),
        previousImageUrl: asDisplayUrl(previousImageMedia?.url, img.previousImageUrl),
      }
      }),
    )

    return {
      ...location,
      images,
    }
  })
}

export async function attachMediaFieldsToGlobalVoice<T extends Record<string, unknown>>(voice: T) {
  return runWithMediaResolveCache(async () => {
    const customVoiceMedia = await resolveMediaRef(voice.customVoiceMediaId, voice.customVoiceUrl)
    return {
      ...voice,
      media: customVoiceMedia,
      customVoiceMedia,
      customVoiceUrl: customVoiceMedia?.url || voice.customVoiceUrl || null,
    }
  })
}

async function attachMediaFieldsToPanel<T extends Record<string, unknown>>(panel: T) {
  const imageMedia = await resolveMediaRef(panel.imageMediaId, panel.imageUrl)
  const videoMedia = await resolveMediaRef(panel.videoMediaId, panel.videoUrl)
  const lipSyncVideoMedia = await resolveMediaRef(panel.lipSyncVideoMediaId, panel.lipSyncVideoUrl)
  const sketchImageMedia = await resolveMediaRef(panel.sketchImageMediaId, panel.sketchImageUrl)
  const previousImageMedia = await resolveMediaRef(panel.previousImageMediaId, panel.previousImageUrl)

  const candidateRaw = parseStringArray(panel.candidateImages)
  const candidateMediaUrls: string[] = []
  for (const candidate of candidateRaw) {
    if (candidate.startsWith('PENDING:')) {
      candidateMediaUrls.push(candidate)
      continue
    }
    const media = await resolveMediaRefFromLegacyValue(candidate)
    candidateMediaUrls.push(asDisplayUrl(media?.url, candidate) || candidate)
  }

  return {
    ...panel,
    media: imageMedia,
    imageMedia,
    videoMedia,
    lipSyncVideoMedia,
    sketchImageMedia,
    previousImageMedia,
    imageUrl: asDisplayUrl(imageMedia?.url, panel.imageUrl),
    videoUrl: videoMedia?.url || (typeof panel.videoUrl === 'string' ? panel.videoUrl : null) || null,
    lipSyncVideoUrl: lipSyncVideoMedia?.url || (typeof panel.lipSyncVideoUrl === 'string' ? panel.lipSyncVideoUrl : null) || null,
    sketchImageUrl: asDisplayUrl(sketchImageMedia?.url, panel.sketchImageUrl),
    previousImageUrl: asDisplayUrl(previousImageMedia?.url, panel.previousImageUrl),
    candidateImages: candidateRaw.length > 0 ? JSON.stringify(candidateMediaUrls) : panel.candidateImages,
  }
}

async function attachMediaFieldsToStoryboard<T extends Record<string, unknown>>(storyboard: T) {
  const storyboardImageMedia = await resolveMediaRefFromLegacyValue(storyboard.storyboardImageUrl)
  const panels = await Promise.all(
    ((storyboard.panels as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToPanel),
  )

  return {
    ...storyboard,
    media: storyboardImageMedia,
    storyboardImageMedia,
    storyboardImageUrl: asDisplayUrl(storyboardImageMedia?.url, storyboard.storyboardImageUrl),
    panels,
  }
}

async function attachMediaFieldsToProjectCharacter<T extends Record<string, unknown>>(character: T) {
  const customVoiceMedia = await resolveMediaRef(character.customVoiceMediaId, character.customVoiceUrl)
  const appearances = await Promise.all(
    ((character.appearances as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToAppearance),
  )
  return {
    ...character,
    media: customVoiceMedia,
    customVoiceMedia,
    customVoiceUrl: customVoiceMedia?.url || character.customVoiceUrl || null,
    appearances,
  }
}

async function attachMediaFieldsToProjectLocation<T extends Record<string, unknown>>(location: T) {
  const images = await Promise.all(
    ((location.images as Array<Record<string, unknown>>) || []).map(async (img) => {
    const imageMedia = await resolveMediaRef(img.imageMediaId, img.imageUrl)
    const previousImageMedia = await resolveMediaRef(img.previousImageMediaId, img.previousImageUrl)
    return {
      ...img,
      media: imageMedia,
      imageMedia,
      previousImageMedia,
      imageUrl: asDisplayUrl(imageMedia?.url, img.imageUrl),
      previousImageUrl: asDisplayUrl(previousImageMedia?.url, img.previousImageUrl),
    }
    }),
  )

  return {
    ...location,
    images,
  }
}

async function attachMediaFieldsToProjectProp<T extends Record<string, unknown>>(prop: T) {
  return await attachMediaFieldsToProjectLocation(prop)
}

async function attachMediaFieldsToShot<T extends Record<string, unknown>>(shot: T) {
  const imageMedia = await resolveMediaRef(shot.imageMediaId, shot.imageUrl)
  const videoMedia = await resolveMediaRefFromLegacyValue(shot.videoUrl)
  return {
    ...shot,
    media: imageMedia,
    imageMedia,
    videoMedia,
    imageUrl: asDisplayUrl(imageMedia?.url, shot.imageUrl),
    videoUrl: videoMedia?.url || (typeof shot.videoUrl === 'string' ? shot.videoUrl : null) || null,
  }
}

async function attachMediaFieldsToVoiceLine<T extends Record<string, unknown>>(line: T) {
  const audioMedia = await resolveMediaRef(line.audioMediaId, line.audioUrl)
  return {
    ...line,
    media: audioMedia,
    audioMedia,
    audioUrl: audioMedia?.url || line.audioUrl || null,
  }
}

export type AttachMediaSections = {
  audio?: boolean
  characters?: boolean
  locations?: boolean
  props?: boolean
  shots?: boolean
  storyboards?: boolean
  voiceLines?: boolean
}

export type AttachMediaFieldsOptions = {
  /** Defaults: all sections enabled when present on the payload. */
  sections?: AttachMediaSections
}

const DEFAULT_ATTACH_SECTIONS: Required<AttachMediaSections> = {
  audio: true,
  characters: true,
  locations: true,
  props: true,
  shots: true,
  storyboards: true,
  voiceLines: true,
}

function resolveAttachSections(options?: AttachMediaFieldsOptions): Required<AttachMediaSections> {
  return {
    ...DEFAULT_ATTACH_SECTIONS,
    ...(options?.sections || {}),
  }
}

function collectScopedProjectMediaIds(
  projectLike: Record<string, unknown>,
  sections: Required<AttachMediaSections>,
): string[] {
  const ids: string[] = []
  if (sections.audio) pushMediaId(ids, projectLike.audioMediaId)

  if (sections.characters) {
    for (const character of (projectLike.characters as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, character.customVoiceMediaId)
      for (const appearance of (character.appearances as Array<Record<string, unknown>>) || []) {
        pushMediaId(ids, appearance.imageMediaId)
        pushMediaId(ids, appearance.previousImageMediaId)
      }
    }
  }

  if (sections.locations) {
    for (const location of (projectLike.locations as Array<Record<string, unknown>>) || []) {
      for (const img of (location.images as Array<Record<string, unknown>>) || []) {
        pushMediaId(ids, img.imageMediaId)
        pushMediaId(ids, img.previousImageMediaId)
      }
    }
  }

  if (sections.props) {
    for (const prop of (projectLike.props as Array<Record<string, unknown>>) || []) {
      for (const img of (prop.images as Array<Record<string, unknown>>) || []) {
        pushMediaId(ids, img.imageMediaId)
        pushMediaId(ids, img.previousImageMediaId)
      }
    }
  }

  if (sections.shots) {
    for (const shot of (projectLike.shots as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, shot.imageMediaId)
    }
  }

  if (sections.storyboards) {
    for (const storyboard of (projectLike.storyboards as Array<Record<string, unknown>>) || []) {
      for (const panel of (storyboard.panels as Array<Record<string, unknown>>) || []) {
        pushMediaId(ids, panel.imageMediaId)
        pushMediaId(ids, panel.videoMediaId)
        pushMediaId(ids, panel.lipSyncVideoMediaId)
        pushMediaId(ids, panel.sketchImageMediaId)
        pushMediaId(ids, panel.previousImageMediaId)
      }
    }
  }

  if (sections.voiceLines) {
    for (const line of (projectLike.voiceLines as Array<Record<string, unknown>>) || []) {
      pushMediaId(ids, line.audioMediaId)
    }
  }

  return ids
}

function collectScopedProjectLegacyStorageKeys(
  projectLike: Record<string, unknown>,
  sections: Required<AttachMediaSections>,
): string[] {
  const keys: string[] = []
  if (sections.audio) pushLegacyStorageKeys(keys, projectLike.audioUrl)

  if (sections.characters) {
    for (const character of (projectLike.characters as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, character.customVoiceUrl)
      for (const appearance of (character.appearances as Array<Record<string, unknown>>) || []) {
        pushLegacyStorageKeys(keys, appearance.imageUrl)
        pushLegacyStorageKeys(keys, appearance.previousImageUrl)
        pushLegacyStorageKeysFromDbArray(keys, appearance.imageUrls, 'appearance.imageUrls')
        pushLegacyStorageKeysFromDbArray(keys, appearance.previousImageUrls, 'appearance.previousImageUrls')
      }
    }
  }

  if (sections.locations) {
    for (const location of (projectLike.locations as Array<Record<string, unknown>>) || []) {
      for (const img of (location.images as Array<Record<string, unknown>>) || []) {
        pushLegacyStorageKeys(keys, img.imageUrl)
        pushLegacyStorageKeys(keys, img.previousImageUrl)
      }
    }
  }

  if (sections.props) {
    for (const prop of (projectLike.props as Array<Record<string, unknown>>) || []) {
      for (const img of (prop.images as Array<Record<string, unknown>>) || []) {
        pushLegacyStorageKeys(keys, img.imageUrl)
        pushLegacyStorageKeys(keys, img.previousImageUrl)
      }
    }
  }

  if (sections.shots) {
    for (const shot of (projectLike.shots as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, shot.imageUrl)
      pushLegacyStorageKeys(keys, shot.videoUrl)
    }
  }

  if (sections.storyboards) {
    for (const storyboard of (projectLike.storyboards as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, storyboard.storyboardImageUrl)
      for (const panel of (storyboard.panels as Array<Record<string, unknown>>) || []) {
        pushLegacyStorageKeys(keys, panel.imageUrl)
        pushLegacyStorageKeys(keys, panel.videoUrl)
        pushLegacyStorageKeys(keys, panel.lipSyncVideoUrl)
        pushLegacyStorageKeys(keys, panel.sketchImageUrl)
        pushLegacyStorageKeys(keys, panel.previousImageUrl)
        for (const candidate of parseStringArray(panel.candidateImages)) {
          pushLegacyStorageKeys(keys, candidate)
        }
      }
    }
  }

  if (sections.voiceLines) {
    for (const line of (projectLike.voiceLines as Array<Record<string, unknown>>) || []) {
      pushLegacyStorageKeys(keys, line.audioUrl)
    }
  }

  return keys
}

export async function attachMediaFieldsToProject<T extends Record<string, unknown>>(
  projectLike: T,
  options?: AttachMediaFieldsOptions,
) {
  const sections = resolveAttachSections(options)

  return runWithMediaResolveCache(async () => {
    await Promise.all([
      prefetchMediaObjectsByIds(collectScopedProjectMediaIds(projectLike, sections)),
      prefetchMediaObjectsByStorageKeys(collectScopedProjectLegacyStorageKeys(projectLike, sections)),
    ])

    const audioMedia = sections.audio
      ? await resolveMediaRef(projectLike.audioMediaId, projectLike.audioUrl)
      : null
    const characters = sections.characters
      ? await Promise.all(
        ((projectLike.characters as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToProjectCharacter),
      )
      : ((projectLike.characters as Array<Record<string, unknown>>) || [])
    const locations = sections.locations
      ? await Promise.all(
        ((projectLike.locations as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToProjectLocation),
      )
      : ((projectLike.locations as Array<Record<string, unknown>>) || [])
    const props = sections.props
      ? await Promise.all(
        ((projectLike.props as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToProjectProp),
      )
      : ((projectLike.props as Array<Record<string, unknown>>) || [])
    const shots = sections.shots
      ? await Promise.all(
        ((projectLike.shots as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToShot),
      )
      : ((projectLike.shots as Array<Record<string, unknown>>) || [])
    const storyboards = sections.storyboards
      ? await Promise.all(
        ((projectLike.storyboards as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToStoryboard),
      )
      : ((projectLike.storyboards as Array<Record<string, unknown>>) || [])
    const voiceLines = sections.voiceLines
      ? await Promise.all(
        ((projectLike.voiceLines as Array<Record<string, unknown>>) || []).map(attachMediaFieldsToVoiceLine),
      )
      : ((projectLike.voiceLines as Array<Record<string, unknown>>) || [])

    return {
      ...projectLike,
      ...(sections.audio
        ? {
          media: audioMedia,
          audioMedia,
          audioUrl: audioMedia?.url || projectLike.audioUrl || null,
        }
        : {}),
      ...(sections.characters ? { characters } : {}),
      ...(sections.locations ? { locations } : {}),
      ...(sections.props ? { props } : {}),
      ...(sections.shots ? { shots } : {}),
      ...(sections.storyboards ? { storyboards } : {}),
      ...(sections.voiceLines ? { voiceLines } : {}),
    }
  })
}

export function firstMediaUrl(list: MediaRef[]): string[] {
  return list.map((m) => m.url)
}
