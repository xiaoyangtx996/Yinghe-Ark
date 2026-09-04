import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getProjectModelConfig } from '@/lib/config-service'
import { executeAiTextStep } from '@/lib/ai-runtime/client'
import { createScopedLogger } from '@/lib/logging/core'
import {
  buildScriptLlmReviewSystemPrompt,
  buildScriptLlmReviewUserPrompt,
  parseScriptLlmReviewResponse,
} from '@/lib/novel-promotion/script-llm-review'

const logger = createScopedLogger({ module: 'api.script-review' })

/**
 * POST /api/novel-promotion/[projectId]/script-review
 * Sync LLM script self-check — returns findings; never blocks generate.
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
      clips: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          summary: true,
          content: true,
          characters: true,
          location: true,
        },
      },
    },
  })

  if (!episode || episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  if (episode.clips.length === 0) {
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
    action: 'script_llm_review',
    temperature: 0.3,
    messages: [
      { role: 'system', content: buildScriptLlmReviewSystemPrompt() },
      { role: 'user', content: buildScriptLlmReviewUserPrompt(episode.clips) },
    ],
    meta: {
      stepId: 'script_llm_review',
      stepTitle: 'Script LLM review',
      stepIndex: 1,
      stepTotal: 1,
    },
  })

  const findings = parseScriptLlmReviewResponse(result.text || '')

  logger.info('script_llm_review_done', {
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
