import { resolveTaskResponse } from '@/lib/task/client'
import {
  AI_STORY_MODES,
  type AiStoryMode,
  type AiStorySelectionMode,
} from '@/lib/story/ai-story-modes'

interface ApiFetchLike {
  (input: string, init?: RequestInit): Promise<Response>
}

interface ExpandHomeStoryPayload {
  expandedText?: string
}

export interface ExpandHomeStoryParams {
  apiFetch: ApiFetchLike
  prompt?: string
  mode?: AiStoryMode
  selectedText?: string
  fullText?: string
}

export interface ExpandHomeStoryResult {
  expandedText: string
}

export async function expandHomeStory({
  apiFetch,
  prompt,
  mode = AI_STORY_MODES.FROM_SCRATCH,
  selectedText,
  fullText,
}: ExpandHomeStoryParams): Promise<ExpandHomeStoryResult> {
  const body: Record<string, string> = {
    mode,
  }

  if (mode === AI_STORY_MODES.FROM_SCRATCH) {
    body.prompt = prompt ?? ''
  } else {
    body.selectedText = selectedText ?? ''
    body.fullText = fullText ?? ''
  }

  const response = await apiFetch('/api/user/ai-story-expand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const result = await resolveTaskResponse<ExpandHomeStoryPayload>(response)
  const expandedText = typeof result.expandedText === 'string' ? result.expandedText.trim() : ''
  if (!expandedText) {
    throw new Error('AI story expand response missing expandedText')
  }

  return {
    expandedText,
  }
}

export async function editHomeStorySelection(params: {
  apiFetch: ApiFetchLike
  mode: AiStorySelectionMode
  selectedText: string
  fullText: string
}): Promise<ExpandHomeStoryResult> {
  return expandHomeStory({
    apiFetch: params.apiFetch,
    mode: params.mode,
    selectedText: params.selectedText,
    fullText: params.fullText,
  })
}
