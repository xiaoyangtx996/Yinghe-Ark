import { logError as _ulogError } from '@/lib/logging/core'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { attachMediaFieldsToProject } from '@/lib/media/attach'
import { resolveMediaRefFromLegacyValue } from '@/lib/media/service'

type EpisodeDetailView = 'full' | 'script' | 'text' | 'panels'

function readEpisodeView(raw: string | null): EpisodeDetailView {
  const view = (raw || 'full').trim().toLowerCase()
  if (view === 'script' || view === 'text' || view === 'panels' || view === 'full') return view
  return 'full'
}

/**
 * GET - 获取单个剧集数据
 * - view=full（默认）：clips + storyboards/panels（签名分镜媒体）+ voiceLines(id)
 * - view=script|text：仅 clips（配置/拆解）；storyboards/voiceLines 为空数组
 * - view=panels：clips(id) + 精简 panels（配音绑镜，不签名媒体）
 */
export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string; episodeId: string }> }
) => {
  const { projectId, episodeId } = await context.params
  const view = readEpisodeView(request.nextUrl.searchParams.get('view'))
  const scriptView = view === 'script' || view === 'text'
  const panelsView = view === 'panels'

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  if (scriptView) {
    const episode = await prisma.novelPromotionEpisode.findUnique({
      where: { id: episodeId },
      include: {
        clips: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!episode) throw new ApiError('NOT_FOUND')

    prisma.novelPromotionProject.update({
      where: { projectId },
      data: { lastEpisodeId: episodeId },
    }).catch((err) => _ulogError('更新 lastEpisodeId 失败:', err))

    const episodeWithSignedUrls = await attachMediaFieldsToProject(
      {
        ...episode,
        storyboards: [],
        voiceLines: [],
      } as unknown as Record<string, unknown>,
      {
        sections: {
          audio: false,
          characters: false,
          locations: false,
          props: false,
          shots: false,
          voiceLines: false,
          storyboards: false,
        },
      },
    )

    return NextResponse.json({ episode: episodeWithSignedUrls })
  }

  if (panelsView) {
    const episode = await prisma.novelPromotionEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        episodeNumber: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        clips: {
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        },
        storyboards: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            clipId: true,
            panels: {
              orderBy: { panelIndex: 'asc' },
              select: {
                id: true,
                panelIndex: true,
                description: true,
                srtSegment: true,
              },
            },
          },
        },
      },
    })
    if (!episode) throw new ApiError('NOT_FOUND')

    prisma.novelPromotionProject.update({
      where: { projectId },
      data: { lastEpisodeId: episodeId },
    }).catch((err) => _ulogError('更新 lastEpisodeId 失败:', err))

    return NextResponse.json({
      episode: {
        ...episode,
        projectId,
        voiceLines: [],
      },
    })
  }

  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
    include: {
      clips: {
        orderBy: { createdAt: 'asc' },
      },
      storyboards: {
        include: {
          panels: { orderBy: { panelIndex: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
      voiceLines: {
        select: { id: true },
        orderBy: { lineIndex: 'asc' },
      },
    },
  })

  if (!episode) {
    throw new ApiError('NOT_FOUND')
  }

  prisma.novelPromotionProject.update({
    where: { projectId },
    data: { lastEpisodeId: episodeId },
  }).catch((err) => _ulogError('更新 lastEpisodeId 失败:', err))

  const episodeWithSignedUrls = await attachMediaFieldsToProject(episode as unknown as Record<string, unknown>, {
    sections: {
      audio: false,
      characters: false,
      locations: false,
      props: false,
      shots: false,
      voiceLines: false,
      storyboards: true,
    },
  })

  return NextResponse.json({ episode: episodeWithSignedUrls })
})

/**
 * PATCH - 更新剧集信息
 */
export const PATCH = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string; episodeId: string }> }
) => {
  const { projectId, episodeId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json()
  const { name, description, novelText, audioUrl, srtContent } = body

  const updateData: Prisma.NovelPromotionEpisodeUncheckedUpdateInput = {}
  if (name !== undefined) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description?.trim() || null
  if (novelText !== undefined) updateData.novelText = novelText
  if (audioUrl !== undefined) {
    updateData.audioUrl = audioUrl
    const media = await resolveMediaRefFromLegacyValue(audioUrl)
    updateData.audioMediaId = media?.id || null
  }
  if (srtContent !== undefined) updateData.srtContent = srtContent

  const episode = await prisma.novelPromotionEpisode.update({
    where: { id: episodeId },
    data: updateData
  })

  return NextResponse.json({ episode })
})

/**
 * DELETE - 删除剧集
 */
export const DELETE = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string; episodeId: string }> }
) => {
  const { projectId, episodeId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  await prisma.novelPromotionEpisode.delete({
    where: { id: episodeId }
  })

  const novelPromotionProject = await prisma.novelPromotionProject.findUnique({
    where: { projectId }
  })

  if (novelPromotionProject?.lastEpisodeId === episodeId) {
    const anotherEpisode = await prisma.novelPromotionEpisode.findFirst({
      where: { novelPromotionProjectId: novelPromotionProject.id },
      orderBy: { episodeNumber: 'asc' },
      select: { id: true },
    })
    await prisma.novelPromotionProject.update({
      where: { projectId },
      data: { lastEpisodeId: anotherEpisode?.id || null }
    })
  }

  return NextResponse.json({ success: true })
})
