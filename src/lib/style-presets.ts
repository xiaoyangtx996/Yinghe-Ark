import {
  DEFAULT_GENRE_PACK_VALUE,
  genrePacksAsStylePresetOptions,
  getGenrePackOption,
  type GenrePackId,
} from '@/lib/genre-packs'

/**
 * Style presets (home / composer) are genre packs in P1 —
 * beginner picks a named genre; art style stays a separate selector.
 */
export interface StylePresetOption {
  value: string
  label: string
  description: string
  enabled: boolean
}

export const STYLE_PRESETS: readonly StylePresetOption[] = genrePacksAsStylePresetOptions()

export const DEFAULT_STYLE_PRESET_VALUE = DEFAULT_GENRE_PACK_VALUE || STYLE_PRESETS[0]?.value || ''

export function getStylePresetOption(value: string): StylePresetOption | null {
  const pack = getGenrePackOption(value)
  if (!pack) return STYLE_PRESETS[0] ?? null
  return {
    value: pack.value,
    label: pack.label,
    description: pack.description,
    enabled: pack.enabled,
  }
}

export type { GenrePackId }
