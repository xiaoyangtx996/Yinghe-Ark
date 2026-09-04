import { describe, expect, it } from 'vitest'
import {
  buildMergedClipFields,
  canMergeWithNext,
  resolveMergeWithNext,
} from '@/lib/novel-promotion/clip-merge'

describe('resolveMergeWithNext', () => {
  it('keeps current and absorbs the next neighbor', () => {
    expect(resolveMergeWithNext(['a', 'b', 'c'], 'a')).toEqual({
      keepClipId: 'a',
      absorbClipId: 'b',
      keepIndex: 0,
      absorbIndex: 1,
    })
  })

  it('returns null for the last clip', () => {
    expect(resolveMergeWithNext(['a', 'b'], 'b')).toBeNull()
    expect(canMergeWithNext(['a', 'b'], 'b')).toBe(false)
  })
})

describe('buildMergedClipFields', () => {
  it('joins content/summary and unions character names', () => {
    const merged = buildMergedClipFields(
      {
        id: 'a',
        summary: '开场',
        content: '甲出门。',
        characters: '["甲"]',
        location: '公寓',
        props: null,
        screenplay: JSON.stringify({ scenes: [{ id: 1 }] }),
        startText: '甲出门',
        endText: '甲关门',
      },
      {
        id: 'b',
        summary: '偶遇',
        content: '乙招手。',
        characters: '乙,丙',
        location: '["地铁"]',
        props: '["伞"]',
        screenplay: JSON.stringify({ scenes: [{ id: 2 }] }),
        startText: '乙招手',
        endText: '一起上车',
      },
    )

    expect(merged.summary).toBe('开场 / 偶遇')
    expect(merged.content).toBe('甲出门。\n\n乙招手。')
    expect(JSON.parse(merged.characters || '[]')).toEqual(['甲', '乙', '丙'])
    expect(JSON.parse(merged.location || '[]')).toEqual(['公寓', '地铁'])
    expect(JSON.parse(merged.props || '[]')).toEqual(['伞'])
    expect(JSON.parse(merged.screenplay || '{}').scenes).toHaveLength(2)
    expect(merged.startText).toBe('甲出门')
    expect(merged.endText).toBe('一起上车')
  })

  it('keeps a single location as a plain string', () => {
    const merged = buildMergedClipFields(
      {
        id: 'a',
        summary: '开场',
        content: '甲出门。',
        characters: '["甲"]',
        location: '公寓',
        props: null,
        screenplay: null,
        startText: null,
        endText: null,
      },
      {
        id: 'b',
        summary: '续',
        content: '甲坐下。',
        characters: null,
        location: null,
        props: null,
        screenplay: null,
        startText: null,
        endText: null,
      },
    )
    expect(merged.location).toBe('公寓')
  })
})
