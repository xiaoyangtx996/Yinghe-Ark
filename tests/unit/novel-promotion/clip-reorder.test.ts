import { describe, expect, it } from 'vitest'
import {
  applyClipIdOrder,
  buildClipCreatedAtUpdates,
  canMoveClip,
  resolveAdjacentClipMove,
  resolveClipDragReorder,
} from '@/lib/novel-promotion/clip-reorder'

describe('resolveAdjacentClipMove', () => {
  const ids = ['a', 'b', 'c']

  it('moves middle clip toward earlier / later neighbors', () => {
    expect(resolveAdjacentClipMove(ids, 'b', 'up')).toEqual({
      fromIndex: 1,
      toIndex: 0,
      neighborId: 'a',
    })
    expect(resolveAdjacentClipMove(ids, 'b', 'down')).toEqual({
      fromIndex: 1,
      toIndex: 2,
      neighborId: 'c',
    })
  })

  it('returns null at boundaries or unknown id', () => {
    expect(resolveAdjacentClipMove(ids, 'a', 'up')).toBeNull()
    expect(resolveAdjacentClipMove(ids, 'c', 'down')).toBeNull()
    expect(resolveAdjacentClipMove(ids, 'x', 'up')).toBeNull()
  })
})

describe('canMoveClip', () => {
  it('mirrors adjacent resolve', () => {
    expect(canMoveClip(['a', 'b'], 'a', 'down')).toBe(true)
    expect(canMoveClip(['a', 'b'], 'a', 'up')).toBe(false)
  })
})

describe('resolveClipDragReorder', () => {
  const ids = ['a', 'b', 'c']

  it('moves later clip before an earlier over target', () => {
    expect(resolveClipDragReorder(ids, 'c', 'a')).toEqual({
      fromIndex: 2,
      toIndex: 0,
      nextOrder: ['c', 'a', 'b'],
    })
  })

  it('moves earlier clip after a later over target', () => {
    expect(resolveClipDragReorder(ids, 'a', 'c')).toEqual({
      fromIndex: 0,
      toIndex: 2,
      nextOrder: ['b', 'c', 'a'],
    })
  })

  it('returns null for same id, unknown id, or no-op', () => {
    expect(resolveClipDragReorder(ids, 'a', 'a')).toBeNull()
    expect(resolveClipDragReorder(ids, 'x', 'a')).toBeNull()
    expect(resolveClipDragReorder(ids, 'a', 'x')).toBeNull()
  })
})

describe('applyClipIdOrder', () => {
  const clips = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ]

  it('reorders objects to match nextOrder', () => {
    expect(applyClipIdOrder(clips, ['c', 'a', 'b'])).toEqual([
      { id: 'c', label: 'C' },
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ])
  })

  it('returns null on length / id mismatch', () => {
    expect(applyClipIdOrder(clips, ['c', 'a'])).toBeNull()
    expect(applyClipIdOrder(clips, ['c', 'a', 'x'])).toBeNull()
  })
})

describe('buildClipCreatedAtUpdates', () => {
  const clips = [
    { id: 'a', createdAt: new Date('2024-01-01T00:00:01Z') },
    { id: 'b', createdAt: new Date('2024-01-01T00:00:02Z') },
    { id: 'c', createdAt: new Date('2024-01-01T00:00:03Z') },
  ]

  it('reassigns sorted timestamps onto the new order', () => {
    const updates = buildClipCreatedAtUpdates(clips, ['c', 'a', 'b'])
    expect(updates).toEqual([
      { id: 'c', createdAt: new Date('2024-01-01T00:00:01Z') },
      { id: 'a', createdAt: new Date('2024-01-01T00:00:02Z') },
      { id: 'b', createdAt: new Date('2024-01-01T00:00:03Z') },
    ])
  })

  it('returns null on length / id mismatch', () => {
    expect(buildClipCreatedAtUpdates(clips, ['c', 'a'])).toBeNull()
    expect(buildClipCreatedAtUpdates(clips, ['c', 'a', 'x'])).toBeNull()
  })

  it('forces unique timestamps when createdAt values collide', () => {
    const dupes = [
      { id: 'a', createdAt: new Date('2024-01-01T00:00:01Z') },
      { id: 'b', createdAt: new Date('2024-01-01T00:00:01Z') },
      { id: 'c', createdAt: new Date('2024-01-01T00:00:01Z') },
    ]
    const updates = buildClipCreatedAtUpdates(dupes, ['c', 'a', 'b'])
    expect(updates?.map((item) => item.createdAt.getTime())).toEqual([
      Date.parse('2024-01-01T00:00:01.000Z'),
      Date.parse('2024-01-01T00:00:01.001Z'),
      Date.parse('2024-01-01T00:00:01.002Z'),
    ])
  })
})
