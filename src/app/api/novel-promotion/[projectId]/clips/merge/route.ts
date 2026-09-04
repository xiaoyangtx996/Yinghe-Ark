import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { createScopedLogger } from '@/lib/logging/core'
import {
  buildMergedClipFields,
  resolveMergeWithNext,
  type ClipMergeSource,
} from '@/lib/novel-promotion/clip-merge'
import { clearVoiceLineMatchesForStoryboard } from '@/lib/novel-promotion/clear-voice-line-panel-matches'
import { STORYBOARD_SCRIPT_STALE_MERGED } from '@/lib/novel-promotion/storyboard-script-stale'

const logger = createScopedLogger({ module: 'api.clips.merge' })

/**
 * POST /api/novel-promotion/[projectId]/clips/merge
 * Merge selected clip with the next clip (keep selected, delete next).
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json().catch(() => ({}))
  const episodeId = typeof body?.episodeId === 'string' ? body.episodeId.trim() : ''
  const keepClipId = typeof body?.keepClipId === 'string' ? body.keepClipId.trim() : ''

  if (!episodeId || !keepClipId) {
    throw new ApiError('INVALID_PARAMS')
  }

  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
    include: {
      novelPromotionProject: { select: { projectId: true } },
      clips: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!episode || episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  const orderedIds = episode.clips.map((clip) => clip.id)
  const target = resolveMergeWithNext(orderedIds, keepClipId)
  if (!target) {
    throw new ApiError('INVALID_PARAMS')
  }

  const keepClip = episode.clips.find((clip) => clip.id === target.keepClipId)
  const absorbClip = episode.clips.find((clip) => clip.id === target.absorbClipId)
  if (!keepClip || !absorbClip) {
    throw new ApiError('NOT_FOUND')
  }

  const merged = buildMergedClipFields(
    keepClip as ClipMergeSource,
    absorbClip as ClipMergeSource,
  )

  let markedScriptStale = false

  await prisma.$transaction(async (tx) => {
    await tx.novelPromotionClip.update({
      where: { id: keepClip.id },
      data: {
        summary: merged.summary || keepClip.summary,
        content: merged.content || keepClip.content,
        characters: merged.characters,
        location: merged.location,
        props: merged.props,
        screenplay: merged.screenplay,
        startText: merged.startText,
        endText: merged.endText,
      },
    })

    const keepStoryboard = await tx.novelPromotionStoryboard.findUnique({
      where: { clipId: keepClip.id },
      select: { id: true },
    })
    if (keepStoryboard) {
      await tx.novelPromotionStoryboard.update({
        where: { id: keepStoryboard.id },
        data: { lastError: STORYBOARD_SCRIPT_STALE_MERGED },
      })
      markedScriptStale = true
    }

    const absorbStoryboard = await tx.novelPromotionStoryboard.findUnique({
      where: { clipId: absorbClip.id },
      include: { panels: { select: { id: true } } },
    })
    if (absorbStoryboard) {
      await clearVoiceLineMatchesForStoryboard(tx, absorbStoryboard)
    }

    // Deleting absorb clip cascades storyboard + panels (schema onDelete Cascade).
    await tx.novelPromotionClip.delete({
      where: { id: absorbClip.id },
    })
  })

  logger.info('clips_merged', {
    projectId,
    episodeId,
    keepClipId: keepClip.id,
    absorbClipId: absorbClip.id,
    scriptStale: markedScriptStale,
  })

  return NextResponse.json({
    success: true,
    keepClipId: keepClip.id,
    absorbClipId: absorbClip.id,
    scriptStale: markedScriptStale,
  })
})
