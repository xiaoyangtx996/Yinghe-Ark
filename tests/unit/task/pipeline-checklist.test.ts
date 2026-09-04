import { describe, expect, it } from 'vitest'
import {
  isPipelineMediaTaskForEpisode,
  resolvePipelineChecklist,
  shouldShowPipelineChecklist,
} from '@/lib/task/pipeline-checklist'

describe('resolvePipelineChecklist', () => {
  it('marks script active while story-to-script is running', () => {
    const items = resolvePipelineChecklist({
      artifacts: {
        hasStory: true,
        hasScript: false,
        hasStoryboard: false,
        hasVideo: false,
        hasVoice: false,
      },
      storyToScriptRunning: true,
      scriptToStoryboardRunning: false,
    })

    expect(items.find((i) => i.id === 'story')?.status).toBe('done')
    expect(items.find((i) => i.id === 'script')?.status).toBe('active')
    expect(items.find((i) => i.id === 'storyboard')?.status).toBe('pending')
  })

  it('marks completed stages as done even if a later run is active', () => {
    const items = resolvePipelineChecklist({
      artifacts: {
        hasStory: true,
        hasScript: true,
        hasStoryboard: true,
        hasVideo: false,
        hasVoice: false,
      },
      storyToScriptRunning: false,
      scriptToStoryboardRunning: true,
    })

    expect(items.map((i) => i.status)).toEqual(['done', 'done', 'done', 'pending', 'pending'])
  })

  it('marks storyboard active when missing and run is active', () => {
    const items = resolvePipelineChecklist({
      artifacts: {
        hasStory: true,
        hasScript: true,
        hasStoryboard: false,
        hasVideo: false,
        hasVoice: false,
      },
      storyToScriptRunning: false,
      scriptToStoryboardRunning: true,
    })

    expect(items.find((i) => i.id === 'storyboard')?.status).toBe('active')
  })

  it('marks video active when video tasks are running', () => {
    const items = resolvePipelineChecklist({
      artifacts: {
        hasStory: true,
        hasScript: true,
        hasStoryboard: true,
        hasVideo: false,
        hasVoice: false,
      },
      storyToScriptRunning: false,
      scriptToStoryboardRunning: false,
      videoRunning: true,
    })

    expect(items.find((i) => i.id === 'video')?.status).toBe('active')
    expect(items.find((i) => i.id === 'voice')?.status).toBe('pending')
  })

  it('marks voice active when voice tasks are running', () => {
    const items = resolvePipelineChecklist({
      artifacts: {
        hasStory: true,
        hasScript: true,
        hasStoryboard: true,
        hasVideo: true,
        hasVoice: false,
      },
      storyToScriptRunning: false,
      scriptToStoryboardRunning: false,
      voiceRunning: true,
    })

    expect(items.find((i) => i.id === 'video')?.status).toBe('done')
    expect(items.find((i) => i.id === 'voice')?.status).toBe('active')
  })
})

describe('shouldShowPipelineChecklist', () => {
  it('shows when a run is active even if items are pending', () => {
    expect(
      shouldShowPipelineChecklist({
        items: [
          { id: 'story', status: 'done' },
          { id: 'script', status: 'pending' },
          { id: 'storyboard', status: 'pending' },
          { id: 'video', status: 'pending' },
          { id: 'voice', status: 'pending' },
        ],
        storyToScriptRunning: true,
        scriptToStoryboardRunning: false,
      }),
    ).toBe(true)
  })

  it('shows when only video checklist item is active', () => {
    expect(
      shouldShowPipelineChecklist({
        items: [
          { id: 'story', status: 'done' },
          { id: 'script', status: 'done' },
          { id: 'storyboard', status: 'done' },
          { id: 'video', status: 'active' },
          { id: 'voice', status: 'pending' },
        ],
        storyToScriptRunning: false,
        scriptToStoryboardRunning: false,
      }),
    ).toBe(true)
  })
})

describe('isPipelineMediaTaskForEpisode', () => {
  it('matches same-episode tasks and project-scoped tasks without episodeId', () => {
    expect(
      isPipelineMediaTaskForEpisode(
        { episodeId: 'ep-1' },
        'ep-1',
      ),
    ).toBe(true)
    expect(
      isPipelineMediaTaskForEpisode(
        { episodeId: null },
        'ep-1',
      ),
    ).toBe(true)
    expect(
      isPipelineMediaTaskForEpisode(
        { episodeId: 'ep-2' },
        'ep-1',
      ),
    ).toBe(false)
  })
})
