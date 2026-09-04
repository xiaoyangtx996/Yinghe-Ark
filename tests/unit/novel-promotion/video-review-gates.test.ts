import { describe, expect, it } from 'vitest'
import {
  VIDEO_REVIEW_GATES,
  buildVideoReviewStorageKey,
  listVideoReviewGateIds,
  parseStoredVideoCheckedGateIds,
  resolveVideoReviewAutoHints,
  resolveVideoReviewProgress,
} from '@/lib/novel-promotion/video-review-gates'

describe('VIDEO_REVIEW_GATES', () => {
  it('exposes at least 6 beginner gates without craft ID prefixes', () => {
    const ids = listVideoReviewGateIds()
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(VIDEO_REVIEW_GATES.every((g) => g.enabled)).toBe(true)
    expect(ids.some((id) => /^(vid|rev|sty|scr)[-_]/i.test(id))).toBe(false)
  })
})

describe('resolveVideoReviewAutoHints', () => {
  it('returns no_panels when empty', () => {
    expect(resolveVideoReviewAutoHints([])).toEqual([{ id: 'no_panels', severity: 'info' }])
  })

  it('flags missing video and failed panels', () => {
    const hints = resolveVideoReviewAutoHints([
      {
        panelId: 'p1',
        imageUrl: 'https://img',
        videoUrl: null,
        videoPrompt: 'pan left',
        videoErrorMessage: null,
      },
      {
        panelId: 'p2',
        imageUrl: 'https://img',
        videoUrl: 'https://vid',
        videoPrompt: '',
        videoErrorMessage: 'timeout',
      },
    ])
    expect(hints.map((h) => h.id)).toEqual(
      expect.arrayContaining(['panels_missing_video', 'panels_missing_prompt', 'panels_failed']),
    )
    expect(hints.find((h) => h.id === 'panels_missing_video')?.panelIds).toEqual(['p1'])
    expect(hints.find((h) => h.id === 'panels_failed')?.panelIds).toEqual(['p2'])
  })
})

describe('progress and storage', () => {
  it('counts and parses checked gates', () => {
    const ids = listVideoReviewGateIds()
    expect(resolveVideoReviewProgress([ids[0]], ids).checked).toBe(1)
    expect(buildVideoReviewStorageKey('p1', 'e1')).toBe('waoowaoo:video-review:p1:e1')
    expect(parseStoredVideoCheckedGateIds(JSON.stringify(['motion_from_frame', 'x']))).toEqual([
      'motion_from_frame',
    ])
  })
})
