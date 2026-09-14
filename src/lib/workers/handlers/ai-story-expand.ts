import type { Job } from 'bullmq'
import { executeAiTextStep } from '@/lib/ai-runtime'
import { withInternalLLMStreamCallbacks } from '@/lib/llm-observe/internal-stream-context'
import { buildPrompt, PROMPT_IDS, type PromptId } from '@/lib/prompt-i18n'
import {
  AI_STORY_MODES,
  isAiStorySelectionMode,
  normalizeAiStoryMode,
  type AiStoryMode,
} from '@/lib/story/ai-story-modes'
import type { TaskJobData } from '@/lib/task/types'
import { reportTaskProgress } from '@/lib/workers/shared'
import { assertTaskActive } from '@/lib/workers/utils'
import { createWorkerLLMStreamCallbacks, createWorkerLLMStreamContext } from './llm-stream'

function readText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function resolveSelectionPromptId(mode: AiStoryMode): PromptId {
  switch (mode) {
    case AI_STORY_MODES.OPTIMIZE:
      return PROMPT_IDS.NP_AI_STORY_SELECTION_OPTIMIZE
    case AI_STORY_MODES.REWRITE:
      return PROMPT_IDS.NP_AI_STORY_SELECTION_REWRITE
    case AI_STORY_MODES.EXPAND:
    default:
      return PROMPT_IDS.NP_AI_STORY_SELECTION_EXPAND
  }
}

function buildStoryPrompt(params: {
  mode: AiStoryMode
  locale: string | undefined
  promptInput: string
  selectedText: string
  fullText: string
}): string {
  if (params.mode === AI_STORY_MODES.FROM_SCRATCH) {
    return buildPrompt({
      promptId: PROMPT_IDS.NP_AI_STORY_EXPAND,
      locale: params.locale === 'en' ? 'en' : 'zh',
      variables: {
        input: params.promptInput,
      },
    })
  }

  return buildPrompt({
    promptId: resolveSelectionPromptId(params.mode),
    locale: params.locale === 'en' ? 'en' : 'zh',
    variables: {
      full_text: params.fullText || params.selectedText,
      selected_text: params.selectedText,
    },
  })
}

export async function handleAiStoryExpandTask(job: Job<TaskJobData>) {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const mode = normalizeAiStoryMode(payload.mode)
  const promptInput = readText(payload.prompt).trim()
  const selectedText = readText(payload.selectedText).trim()
  const fullText = readText(payload.fullText)
  const analysisModel = readText(payload.analysisModel).trim()

  if (!analysisModel) {
    throw new Error('analysisModel is required')
  }

  if (mode === AI_STORY_MODES.FROM_SCRATCH) {
    if (!promptInput) {
      throw new Error('prompt is required')
    }
  } else if (isAiStorySelectionMode(mode)) {
    if (!selectedText) {
      throw new Error('selectedText is required')
    }
  }

  const prompt = buildStoryPrompt({
    mode,
    locale: job.data.locale,
    promptInput,
    selectedText,
    fullText,
  })

  await reportTaskProgress(job, 25, {
    stage: 'ai_story_expand_prepare',
    stageLabel: mode === AI_STORY_MODES.FROM_SCRATCH ? '准备故事扩写参数' : '准备选区改文参数',
    displayMode: 'loading',
  })
  await assertTaskActive(job, 'ai_story_expand_prepare')

  const streamContext = createWorkerLLMStreamContext(job, 'ai_story_expand')
  const streamCallbacks = createWorkerLLMStreamCallbacks(job, streamContext)

  const completion = await withInternalLLMStreamCallbacks(
    streamCallbacks,
    async () =>
      await executeAiTextStep({
        userId: job.data.userId,
        model: analysisModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        projectId: job.data.projectId || 'home-ai-write',
        action: 'ai_story_expand',
        meta: {
          stepId: 'ai_story_expand',
          stepTitle: mode === AI_STORY_MODES.FROM_SCRATCH ? '故事扩写' : '选区改文',
          stepIndex: 1,
          stepTotal: 1,
        },
      }),
  )
  await streamCallbacks.flush()
  await assertTaskActive(job, 'ai_story_expand_persist')

  const expandedText = completion.text.trim()
  if (!expandedText) {
    throw new Error('AI story expand response is empty')
  }

  await reportTaskProgress(job, 96, {
    stage: 'ai_story_expand_done',
    stageLabel: mode === AI_STORY_MODES.FROM_SCRATCH ? '故事扩写已完成' : '选区改文已完成',
    displayMode: 'loading',
  })

  return {
    expandedText,
  }
}
