import { describe, expect, it } from 'vitest'
import {
  resolveActivityFeedLayer,
  resolveAgentActivityFeed,
} from '@/lib/llm-console/agent-activity-feed'

describe('resolveActivityFeedLayer', () => {
  it('maps analysis and split steps to understand', () => {
    expect(resolveActivityFeedLayer('analyze_characters')).toBe('understand')
    expect(resolveActivityFeedLayer('analyze_locations')).toBe('understand')
    expect(resolveActivityFeedLayer('split_clips')).toBe('understand')
  })

  it('maps screenplay and storyboard steps to craft', () => {
    expect(resolveActivityFeedLayer('screenplay_clip_1')).toBe('craft')
    expect(resolveActivityFeedLayer('storyboard_plan')).toBe('craft')
  })
})

describe('resolveAgentActivityFeed', () => {
  it('derives beginner feed rows from stages', () => {
    const feed = resolveAgentActivityFeed([
      { id: 'analyze_characters', title: 'progress.streamStep.analyzeCharacters', status: 'completed' },
      { id: 'split_clips', title: 'progress.streamStep.splitClips', status: 'processing' },
      { id: 'screenplay_clip_1', title: 'progress.streamStep.screenplayConversion', status: 'pending' },
      { id: 'screenplay_clip_2', title: 'progress.streamStep.screenplayConversion', status: 'failed', subtitle: 'timeout' },
    ])

    expect(feed).toEqual([
      {
        id: 'analyze_characters',
        layer: 'understand',
        title: 'progress.streamStep.analyzeCharacters',
        status: 'done',
        subtitle: undefined,
      },
      {
        id: 'split_clips',
        layer: 'understand',
        title: 'progress.streamStep.splitClips',
        status: 'active',
        subtitle: undefined,
      },
      {
        id: 'screenplay_clip_1',
        layer: 'craft',
        title: 'progress.streamStep.screenplayConversion',
        status: 'pending',
        subtitle: undefined,
      },
      {
        id: 'screenplay_clip_2',
        layer: 'craft',
        title: 'progress.streamStep.screenplayConversion',
        status: 'failed',
        subtitle: 'timeout',
      },
    ])
  })

  it('returns empty list when stages are empty', () => {
    expect(resolveAgentActivityFeed([])).toEqual([])
  })
})
