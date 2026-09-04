import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getProjectModelConfig } from '@/lib/config-service'
import { executeAiTextStep } from '@/lib/ai-runtime/client'
import { createScopedLogger } from '@/lib/logging/core'
import {
  buildStoryboardLlmReviewSystemPrompt,
  buildStoryboardLlmReviewUserPrompt,
  parseStoryboardLlmReviewResponse,
} from '@/lib/novel-promotion/storyboard-llm-review'
import type { StoryboardReviewBoardInput } from '@/lib/novel-promotion/storyboard-review-gates'

const logger = createScopedLogger({ module: 'api.storyboard-review' })

/**
 * POST /api/novel-promotion/[projectId]/storyboard-review
 * Sync LLM storyboard self-check — returns findings; never blocks video generate.
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => ({}))
  const episodeId = typeof body?.episodeId === 'string' ? body.episodeId.trim() : ''
  if (!episodeId) {
    throw new ApiError('INVALID_PARAMS')
  }

  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
    include: {
      novelPromotionProject: { select: { projectId: true } },
      storyboards: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          panels: {
            orderBy: { panelIndex: 'asc' },
            select: {
              id: true,
              description: true,
              imagePrompt: true,
              imageUrl: true,
              characters: true,
              location: true,
            },
          },
        },
      },
    },
  })

  if (!episode || episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  const storyboards = episode.storyboards as StoryboardReviewBoardInput[]
  const panelCount = storyboards.reduce(
    (sum, board) => sum + (Array.isArray(board.panels) ? board.panels.length : 0),
    0,
  )
  if (panelCount === 0) {
    throw new ApiError('INVALID_PARAMS')
  }

  const modelConfig = await getProjectModelConfig(projectId, session.user.id)
  if (!modelConfig.analysisModel) {
    throw new ApiError('MISSING_CONFIG')
  }

  const result = await executeAiTextStep({
    userId: session.user.id,
    model: modelConfig.analysisModel,
    projectId,
    action: 'storyboard_llm_review',
    temperature: 0.3,
    messages: [
      { role: 'system', content: buildStoryboardLlmReviewSystemPrompt() },
      { role: 'user', content: buildStoryboardLlmReviewUserPrompt(storyboards) },
    ],
    meta: {
      stepId: 'storyboard_llm_review',
      stepTitle: 'Storyboard LLM review',
      stepIndex: 1,
      stepTotal: 1,
    },
  })

  const findings = parseStoryboardLlmReviewResponse(result.text || '')

  logger.info('storyboard_llm_review_done', {
    projectId,
    episodeId,
    findingCount: findings.length,
    usage: result.usage,
  })

  return NextResponse.json({
    success: true,
    findings,
  })
})
