import { describe, expect, it } from 'vitest'
import { formatProjectStatsLine, formatProjectStatsParts } from '@/lib/projects/format-project-stats'

const label = (key: 'episodes' | 'panels' | 'images' | 'videos', n: number) => {
  if (key === 'episodes') return `${n} 集`
  if (key === 'panels') return `${n} 镜`
  if (key === 'images') return `${n} 图`
  return `${n} 视频`
}

describe('formatProjectStatsParts', () => {
  it('prefers panels over images when panels > 0', () => {
    expect(
      formatProjectStatsParts(
        { episodes: 1, images: 3, videos: 0, panels: 9 },
        label,
      ),
    ).toEqual(['1 集', '9 镜'])
  })

  it('falls back to images when panels is 0', () => {
    expect(
      formatProjectStatsParts(
        { episodes: 2, images: 4, videos: 1, panels: 0 },
        label,
      ),
    ).toEqual(['2 集', '4 图', '1 视频'])
  })

  it('returns empty for missing or zero stats', () => {
    expect(formatProjectStatsParts(undefined, label)).toEqual([])
    expect(
      formatProjectStatsParts(
        { episodes: 0, images: 0, videos: 0, panels: 0 },
        label,
      ),
    ).toEqual([])
  })
})

describe('formatProjectStatsLine', () => {
  it('joins with middle dot', () => {
    expect(
      formatProjectStatsLine(
        { episodes: 1, images: 0, videos: 2, panels: 9 },
        label,
      ),
    ).toBe('1 集 · 9 镜 · 2 视频')
  })
})
