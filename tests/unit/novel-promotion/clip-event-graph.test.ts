import { describe, expect, it } from 'vitest'
import {
  parseClipCharacterNames,
  resolveClipEventKind,
  resolveClipEventNodes,
} from '@/lib/novel-promotion/clip-event-graph'

describe('parseClipCharacterNames', () => {
  it('parses JSON array of strings and objects', () => {
    expect(parseClipCharacterNames('["甲","乙"]')).toEqual(['甲', '乙'])
    expect(parseClipCharacterNames('[{"name":"甲"},{"name":"乙"}]')).toEqual(['甲', '乙'])
  })

  it('falls back to comma-separated names', () => {
    expect(parseClipCharacterNames('甲, 乙 ,丙')).toEqual(['甲', '乙', '丙'])
  })
})

describe('resolveClipEventKind', () => {
  it('marks first and last clips', () => {
    expect(resolveClipEventKind(0, 3)).toBe('opening')
    expect(resolveClipEventKind(1, 3)).toBe('beat')
    expect(resolveClipEventKind(2, 3)).toBe('ending')
  })

  it('treats single clip as opening', () => {
    expect(resolveClipEventKind(0, 1)).toBe('opening')
  })
})

describe('resolveClipEventNodes', () => {
  it('projects clips into beginner event nodes', () => {
    const nodes = resolveClipEventNodes([
      { id: 'c1', summary: '清晨出门', characters: '["小明"]', location: '公寓' },
      { id: 'c2', summary: '地铁偶遇', characters: '小明,小红', location: '地铁' },
      { id: 'c3', summary: '公司对峙后留下悬念', characters: '[]', location: null },
    ])

    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toMatchObject({
      id: 'c1',
      kind: 'opening',
      title: '清晨出门',
      characters: ['小明'],
      location: '公寓',
    })
    expect(nodes[1].kind).toBe('beat')
    expect(nodes[1].characters).toEqual(['小明', '小红'])
    expect(nodes[2].kind).toBe('ending')
  })

  it('returns empty list for empty clips', () => {
    expect(resolveClipEventNodes([])).toEqual([])
  })
})
