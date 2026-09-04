import { describe, expect, it } from 'vitest'
import {
  getGenrePackPrompt,
  isGenrePackId,
  resolveVisualGenerationPrompt,
} from '@/lib/genre-packs'

describe('genre packs', () => {
  it('accepts enabled genre pack ids', () => {
    expect(isGenrePackId('romance_mogul')).toBe(true)
    expect(isGenrePackId('unknown')).toBe(false)
  })

  it('returns locale-specific genre constraint', () => {
    const zh = getGenrePackPrompt('mystery_rules', 'zh')
    const en = getGenrePackPrompt('mystery_rules', 'en')
    expect(zh).toContain('悬疑规则')
    expect(en.toLowerCase()).toContain('rule mystery')
  })

  it('appends genre constraint after art style prompt', () => {
    const combined = resolveVisualGenerationPrompt({
      artStylePrompt: 'Japanese anime style',
      genrePack: 'urban_slice',
      locale: 'zh',
    })
    expect(combined.startsWith('Japanese anime style')).toBe(true)
    expect(combined).toContain('都市生活流')
  })

  it('keeps art style only when genre missing', () => {
    expect(
      resolveVisualGenerationPrompt({
        artStylePrompt: 'realistic',
        genrePack: null,
        locale: 'zh',
      }),
    ).toBe('realistic')
  })
})
