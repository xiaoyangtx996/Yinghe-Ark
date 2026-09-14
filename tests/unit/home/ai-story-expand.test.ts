import { describe, expect, it, vi } from 'vitest'
import { expandHomeStory, editHomeStorySelection } from '@/lib/home/ai-story-expand'
import { AI_STORY_MODES } from '@/lib/story/ai-story-modes'

vi.mock('@/lib/task/client', () => ({
  resolveTaskResponse: vi.fn(),
}))

import { resolveTaskResponse } from '@/lib/task/client'

function buildJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('expandHomeStory', () => {
  it('posts from_scratch mode with prompt and returns expanded text', async () => {
    const apiFetch = vi.fn(async () => buildJsonResponse({ async: true, taskId: 'task-1' }))
    vi.mocked(resolveTaskResponse).mockResolvedValue({
      expandedText: '扩写后的故事正文',
    })

    const result = await expandHomeStory({
      apiFetch,
      prompt: '宫廷复仇女主回京',
    })

    expect(apiFetch).toHaveBeenCalledWith('/api/user/ai-story-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: AI_STORY_MODES.FROM_SCRATCH,
        prompt: '宫廷复仇女主回京',
      }),
    })
    expect(result).toEqual({
      expandedText: '扩写后的故事正文',
    })
  })

  it('posts selection optimize mode with selectedText and fullText', async () => {
    const apiFetch = vi.fn(async () => buildJsonResponse({ async: true, taskId: 'task-2' }))
    vi.mocked(resolveTaskResponse).mockResolvedValue({
      expandedText: '润色后的选区',
    })

    const result = await editHomeStorySelection({
      apiFetch,
      mode: AI_STORY_MODES.OPTIMIZE,
      selectedText: '原选区',
      fullText: '前文原选区后文',
    })

    expect(apiFetch).toHaveBeenCalledWith('/api/user/ai-story-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: AI_STORY_MODES.OPTIMIZE,
        selectedText: '原选区',
        fullText: '前文原选区后文',
      }),
    })
    expect(result).toEqual({
      expandedText: '润色后的选区',
    })
  })

  it('fails explicitly when the route does not return expandedText', async () => {
    const apiFetch = vi.fn(async () => buildJsonResponse({ async: true, taskId: 'task-1' }))
    vi.mocked(resolveTaskResponse).mockResolvedValue({})

    await expect(expandHomeStory({
      apiFetch,
      prompt: '宫廷复仇女主回京',
    })).rejects.toThrow('AI story expand response missing expandedText')
  })
})
