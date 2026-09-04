import { describe, expect, it } from 'vitest'
import {
  buildStoryboardReviewStorageKey,
  listStoryboardReviewGateIds,
  parseStoredStoryboardCheckedGateIds,
  resolveStoryboardReviewAutoHints,
  resolveStoryboardReviewProgress,
  STORYBOARD_REVIEW_GATES,
} from '@/lib/novel-promotion/storyboard-review-gates'

describe('STORYBOARD_REVIEW_GATES', () => {
  it('exposes at least 6 beginner gates without craft IDs', () => {
    const ids = listStoryboardReviewGateIds()
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(STORYBOARD_REVIEW_GATES.every((g) => g.enabled)).toBe(true)
    expect(ids.some((id) => /^(vid|rev|sty|scr)[-_]/i.test(id))).toBe(false)
  })
})

describe('resolveStoryboardReviewAutoHints', () => {
  it('returns no_storyboards when empty', () => {
    expect(resolveStoryboardReviewAutoHints([])).toEqual([
      { id: 'no_storyboards', severity: 'info' },
    ])
  })

  it('flags missing images and descriptions', () => {
    const hints = resolveStoryboardReviewAutoHints([
      {
        id: 'sb1',
        panels: [
          { id: 'p1', description: '特写', imageUrl: null, characters: '["甲"]' },
          { id: 'p2', description: '', imagePrompt: '', imageUrl: 'https://x', characters: null },
        ],
      },
    ])
    expect(hints.map((h) => h.id)).toEqual(
      expect.arrayContaining(['panels_missing_image', 'panels_missing_description', 'panels_missing_characters']),
    )
    expect(hints.find((h) => h.id === 'panels_missing_image')?.panelIds).toEqual(['p1'])
    expect(hints.find((h) => h.id === 'panels_missing_description')?.panelIds).toEqual(['p2'])
  })
})

describe('progress and storage', () => {
  it('counts checked gates and parses storage', () => {
    const ids = listStoryboardReviewGateIds()
    expect(resolveStoryboardReviewProgress([ids[0]], ids).checked).toBe(1)
    expect(buildStoryboardReviewStorageKey('p1', 'e1')).toBe('waoowaoo:storyboard-review:p1:e1')
    expect(parseStoredStoryboardCheckedGateIds(JSON.stringify(['shot_purpose', 'x']))).toEqual([
      'shot_purpose',
    ])
  })
})
