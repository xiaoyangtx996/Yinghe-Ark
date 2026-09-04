import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getProjectModelConfig } from '@/lib/config-service'
import { executeAiTextStep } from '@/lib/ai-runtime/client'
import { createScopedLogger } from '@/lib/logging/core'
import {
  buildVideoLlmReviewSystemPrompt,
  buildVideoLlmReviewUserPrompt,
  parseVideoLlmReviewResponse,
} from '@/lib/novel-promotion/video-llm-review'
import type { VideoReviewPanelInput } from '@/lib/novel-promotion/video-review-gates'

const logger = createScopedLogger({ module: 'api.video-review' })

/**
 * POST /api/novel-promotion/[projectId]/video-review
 * Sync LLM video self-check — returns findings; never blocks batch generate.
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
          storyboard: {
            select: {
              panels: {
                orderBy: { panelIndex: 'asc' },
                select: {
                  id: true,
                  imageUrl: true,
                  videoUrl: true,
                  videoPrompt: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!episode || episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  const panels: VideoReviewPanelInput[] = []
  for (const clip of episode.clips) {
    const clipPanels = clip.storyboard?.panels
    if (!Array.isArray(clipPanels)) continue
    for (const panel of clipPanels) {
      panels.push({
        panelId: panel.id,
        imageUrl: panel.imageUrl,
        videoUrl: panel.videoUrl,
        videoPrompt: panel.videoPrompt,
        videoErrorMessage: null,
      })
    }
  }

  if (panels.length === 0) {
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
    action: 'video_llm_review',
    temperature: 0.3,
    messages: [
      { role: 'system', content: buildVideoLlmReviewSystemPrompt() },
      { role: 'user', content: buildVideoLlmReviewUserPrompt(panels) },
    ],
    meta: {
      stepId: 'video_llm_review',
      stepTitle: 'Video LLM review',
      stepIndex: 1,
      stepTotal: 1,
    },
  })

  const findings = parseVideoLlmReviewResponse(result.text || '')

  logger.info('video_llm_review_done', {
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
