import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getUserModelConfig } from '@/lib/config-service'
import { maybeSubmitLLMTask } from '@/lib/llm-observe/route-task'
import {
  AI_STORY_MODES,
  isAiStoryMode,
  isAiStorySelectionMode,
  normalizeAiStoryMode,
} from '@/lib/story/ai-story-modes'
import { TASK_TYPE } from '@/lib/task/types'

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  if (body.mode !== undefined && !isAiStoryMode(body.mode)) {
    throw new ApiError('INVALID_PARAMS')
  }
  const mode = normalizeAiStoryMode(body.mode)

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const selectedText = typeof body.selectedText === 'string' ? body.selectedText.trim() : ''
  const fullText = typeof body.fullText === 'string' ? body.fullText : ''

  if (mode === AI_STORY_MODES.FROM_SCRATCH) {
    if (!prompt) {
      throw new ApiError('INVALID_PARAMS')
    }
  } else if (isAiStorySelectionMode(mode)) {
    if (!selectedText) {
      throw new ApiError('INVALID_PARAMS')
    }
  }

  const userConfig = await getUserModelConfig(session.user.id)
  if (!userConfig.analysisModel) {
    throw new ApiError('MISSING_CONFIG')
  }

  const dedupeSeed = mode === AI_STORY_MODES.FROM_SCRATCH
    ? `${session.user.id}:home-story-expand:${prompt}`
    : `${session.user.id}:home-story-edit:${mode}:${selectedText}:${fullText.slice(0, 200)}`

  const dedupeDigest = createHash('sha1')
    .update(dedupeSeed)
    .digest('hex')
    .slice(0, 16)

  const asyncTaskResponse = await maybeSubmitLLMTask({
    request,
    userId: session.user.id,
    projectId: 'home-ai-write',
    type: TASK_TYPE.AI_STORY_EXPAND,
    targetType: 'HomeAiStoryExpand',
    targetId: session.user.id,
    routePath: '/api/user/ai-story-expand',
    body: {
      mode,
      prompt,
      selectedText,
      fullText,
      analysisModel: userConfig.analysisModel,
    },
    dedupeKey: `home_ai_story_expand:${dedupeDigest}`,
    priority: 1,
  })
  if (asyncTaskResponse) return asyncTaskResponse

  throw new ApiError('INVALID_PARAMS')
})
