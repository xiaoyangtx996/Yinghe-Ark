import { describe, expect, it } from 'vitest'
import {
  buildScriptReviewStorageKey,
  listScriptReviewGateIds,
  parseStoredCheckedGateIds,
  resolveScriptReviewAutoHints,
  resolveScriptReviewProgress,
  SCRIPT_REVIEW_GATES,
} from '@/lib/novel-promotion/script-review-gates'

describe('SCRIPT_REVIEW_GATES', () => {
  it('exposes at least 6 beginner gates without craft IDs in the id list', () => {
    const ids = listScriptReviewGateIds()
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(SCRIPT_REVIEW_GATES.every((g) => g.enabled)).toBe(true)
    expect(ids.some((id) => /STY|SCR/i.test(id))).toBe(false)
  })
})

describe('resolveScriptReviewAutoHints', () => {
  it('returns no_clips when empty', () => {
    expect(resolveScriptReviewAutoHints([])).toEqual([{ id: 'no_clips', severity: 'info' }])
  })

  it('flags missing characters and single-clip structure', () => {
    const hints = resolveScriptReviewAutoHints([
      { id: 'c1', summary: '开场', characters: null, location: '公寓' },
    ])
    expect(hints.map((h) => h.id)).toEqual(
      expect.arrayContaining(['single_clip', 'missing_characters']),
    )
  })

  it('flags empty JSON location as missing', () => {
    const hints = resolveScriptReviewAutoHints([
      { id: 'c1', summary: '开场', characters: '["甲"]', location: '[]' },
      { id: 'c2', summary: '冲突', characters: '甲', location: '公寓' },
    ])
    const missing = hints.find((h) => h.id === 'missing_location')
    expect(missing?.clipIds).toEqual(['c1'])
  })
})

describe('resolveScriptReviewProgress', () => {
  it('counts checked gates', () => {
    const ids = listScriptReviewGateIds()
    expect(resolveScriptReviewProgress([ids[0], ids[1]], ids)).toEqual({
      checked: 2,
      total: ids.length,
      ratio: 2 / ids.length,
    })
  })
})

describe('storage helpers', () => {
  it('builds stable keys and parses stored ids', () => {
    expect(buildScriptReviewStorageKey('p1', 'e1')).toBe('waoowaoo:script-review:p1:e1')
    expect(parseStoredCheckedGateIds(JSON.stringify(['opening_pressure', 'nope']))).toEqual([
      'opening_pressure',
    ])
  })
})
