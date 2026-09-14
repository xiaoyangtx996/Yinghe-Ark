import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASK_TYPE, type TaskJobData } from '@/lib/task/types'
import { AI_STORY_MODES } from '@/lib/story/ai-story-modes'

const aiRuntimeMock = vi.hoisted(() => ({
  executeAiTextStep: vi.fn(async () => ({
    text: '扩写后的完整故事内容',
    reasoning: '',
  })),
}))

const workerMock = vi.hoisted(() => ({
  reportTaskProgress: vi.fn(async () => undefined),
  assertTaskActive: vi.fn(async () => undefined),
}))

const promptMock = vi.hoisted(() => ({
  buildPrompt: vi.fn(() => 'story-expand-prompt'),
}))

vi.mock('@/lib/ai-runtime', () => aiRuntimeMock)
vi.mock('@/lib/llm-observe/internal-stream-context', () => ({
  withInternalLLMStreamCallbacks: vi.fn(async (_callbacks: unknown, fn: () => Promise<unknown>) => await fn()),
}))
vi.mock('@/lib/prompt-i18n', () => ({
  PROMPT_IDS: {
    NP_AI_STORY_EXPAND: 'np_ai_story_expand',
    NP_AI_STORY_SELECTION_EXPAND: 'np_ai_story_selection_expand',
    NP_AI_STORY_SELECTION_OPTIMIZE: 'np_ai_story_selection_optimize',
    NP_AI_STORY_SELECTION_REWRITE: 'np_ai_story_selection_rewrite',
  },
  buildPrompt: promptMock.buildPrompt,
}))
vi.mock('@/lib/workers/shared', () => ({ reportTaskProgress: workerMock.reportTaskProgress }))
vi.mock('@/lib/workers/utils', () => ({ assertTaskActive: workerMock.assertTaskActive }))
vi.mock('@/lib/workers/handlers/llm-stream', () => ({
  createWorkerLLMStreamContext: vi.fn(() => ({ streamRunId: 'run-1', nextSeqByStepLane: {} })),
  createWorkerLLMStreamCallbacks: vi.fn(() => ({
    onStage: vi.fn(),
    onChunk: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
    flush: vi.fn(async () => undefined),
  })),
}))

import { handleAiStoryExpandTask } from '@/lib/workers/handlers/ai-story-expand'

function buildJob(payload: Record<string, unknown>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-ai-story-expand-1',
      type: TASK_TYPE.AI_STORY_EXPAND,
      locale: 'zh',
      projectId: 'home-ai-write',
      targetType: 'HomeAiStoryExpand',
      targetId: 'user-1',
      payload,
      userId: 'user-1',
    },
  } as unknown as Job<TaskJobData>
}

describe('worker ai-story-expand behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    promptMock.buildPrompt.mockReturnValue('story-expand-prompt')
  })

  it('missing prompt -> explicit error', async () => {
    const job = buildJob({ prompt: '   ', analysisModel: 'provider::analysis-model' })
    await expect(handleAiStoryExpandTask(job)).rejects.toThrow('prompt is required')
  })

  it('missing analysis model -> explicit error', async () => {
    const job = buildJob({ prompt: '宫廷复仇女主回京' })
    await expect(handleAiStoryExpandTask(job)).rejects.toThrow('analysisModel is required')
  })

  it('selection mode without selectedText -> explicit error', async () => {
    const job = buildJob({
      mode: AI_STORY_MODES.EXPAND,
      selectedText: '  ',
      analysisModel: 'provider::analysis-model',
    })
    await expect(handleAiStoryExpandTask(job)).rejects.toThrow('selectedText is required')
  })

  it('success path -> returns expanded text without touching episode persistence', async () => {
    const job = buildJob({ prompt: '宫廷复仇女主回京', analysisModel: 'provider::analysis-model' })
    const result = await handleAiStoryExpandTask(job)

    expect(result).toEqual({
      expandedText: '扩写后的完整故事内容',
    })
    expect(promptMock.buildPrompt).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'np_ai_story_expand',
    }))
    expect(aiRuntimeMock.executeAiTextStep).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      model: 'provider::analysis-model',
      projectId: 'home-ai-write',
      action: 'ai_story_expand',
    }))
  })

  it('optimize selection -> uses selection optimize prompt', async () => {
    const job = buildJob({
      mode: AI_STORY_MODES.OPTIMIZE,
      selectedText: '选中段落',
      fullText: '前文选中段落后文',
      analysisModel: 'provider::analysis-model',
    })
    const result = await handleAiStoryExpandTask(job)

    expect(result).toEqual({
      expandedText: '扩写后的完整故事内容',
    })
    expect(promptMock.buildPrompt).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'np_ai_story_selection_optimize',
      variables: {
        full_text: '前文选中段落后文',
        selected_text: '选中段落',
      },
    }))
  })
})
