import { describe, expect, it } from 'vitest'
import {
  VOICE_REVIEW_GATES,
  buildVoiceReviewStorageKey,
  listVoiceReviewGateIds,
  parseStoredVoiceCheckedGateIds,
  resolveVoiceReviewAutoHints,
  resolveVoiceReviewProgress,
} from '@/lib/novel-promotion/voice-review-gates'

describe('VOICE_REVIEW_GATES', () => {
  it('exposes at least 6 beginner gates without craft ID prefixes', () => {
    const ids = listVoiceReviewGateIds()
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(VOICE_REVIEW_GATES.every((g) => g.enabled)).toBe(true)
    expect(ids.some((id) => /^(vid|rev|sty|scr|vox)[-_]/i.test(id))).toBe(false)
  })
})

describe('resolveVoiceReviewAutoHints', () => {
  it('returns no_lines when empty', () => {
    expect(resolveVoiceReviewAutoHints([])).toEqual([{ id: 'no_lines', severity: 'info' }])
  })

  it('flags missing voice, audio, panel, and empty content', () => {
    const hints = resolveVoiceReviewAutoHints([
      {
        lineId: 'l1',
        speaker: '甲',
        content: '你好',
        audioUrl: null,
        matchedPanelId: 'p1',
        speakerHasVoice: false,
      },
      {
        lineId: 'l2',
        speaker: '乙',
        content: '  ',
        audioUrl: 'https://audio',
        matchedPanelId: null,
        speakerHasVoice: true,
      },
    ])
    expect(hints.map((h) => h.id)).toEqual(
      expect.arrayContaining([
        'speakers_missing_voice',
        'lines_missing_audio',
        'lines_missing_panel',
        'lines_empty_content',
      ]),
    )
    expect(hints.find((h) => h.id === 'speakers_missing_voice')?.lineIds).toEqual(['l1'])
    expect(hints.find((h) => h.id === 'lines_missing_audio')?.lineIds).toEqual(['l1'])
    expect(hints.find((h) => h.id === 'lines_empty_content')?.lineIds).toEqual(['l2'])
    expect(hints.find((h) => h.id === 'lines_missing_panel')?.lineIds).toEqual(['l2'])
  })

  it('flags single_line when only one line exists', () => {
    const hints = resolveVoiceReviewAutoHints([
      {
        lineId: 'only',
        speaker: '甲',
        content: '一句',
        audioUrl: 'https://a',
        matchedPanelId: 'p1',
        speakerHasVoice: true,
      },
    ])
    expect(hints.some((h) => h.id === 'single_line')).toBe(true)
  })
})

describe('progress and storage', () => {
  it('counts and parses checked gates', () => {
    const ids = listVoiceReviewGateIds()
    expect(resolveVoiceReviewProgress([ids[0]], ids).checked).toBe(1)
    expect(buildVoiceReviewStorageKey('p1', 'e1')).toBe('waoowaoo:voice-review:p1:e1')
    expect(parseStoredVoiceCheckedGateIds(JSON.stringify(['speakers_have_voice', 'x']))).toEqual([
      'speakers_have_voice',
    ])
  })
})
