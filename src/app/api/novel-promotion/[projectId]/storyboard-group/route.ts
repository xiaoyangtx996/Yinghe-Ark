import { logInfo as _ulogInfo } from '@/lib/logging/core'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import {
  buildClipCreatedAtUpdates,
  resolveAdjacentClipMove,
  resolveClipDragReorder,
} from '@/lib/novel-promotion/clip-reorder'
import { clearVoiceLineMatchesForStoryboard } from '@/lib/novel-promotion/clear-voice-line-panel-matches'

/**
 * POST /api/novel-promotion/[projectId]/storyboard-group
 * 添加一组新的分镜（创建 Clip + Storyboard + 初始 Panel）
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  // 🔐 统一权限验证
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json()
  const { episodeId, insertIndex } = body

  if (!episodeId) {
    throw new ApiError('INVALID_PARAMS')
  }

  // 获取剧集和现有 clips
  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
    include: {
      novelPromotionProject: { select: { projectId: true } },
      clips: { orderBy: { createdAt: 'asc' } }
    }
  })

  if (!episode || episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  const existingClips = episode.clips
  const insertAt = insertIndex !== undefined ? insertIndex : existingClips.length

  // 计算新 clip 的 createdAt 时间，用于排序
  let newCreatedAt: Date

  if (existingClips.length === 0) {
    // 没有现有 clips，使用当前时间
    newCreatedAt = new Date()
  } else if (insertAt === 0) {
    // 插入到开头，设置为第一个 clip 之前的时间
    const firstClip = existingClips[0]
    newCreatedAt = new Date(firstClip.createdAt.getTime() - 1000) // 减1秒
  } else if (insertAt >= existingClips.length) {
    // 插入到结尾，设置为最后一个 clip 之后的时间
    const lastClip = existingClips[existingClips.length - 1]
    newCreatedAt = new Date(lastClip.createdAt.getTime() + 1000) // 加1秒
  } else {
    // 插入到中间，设置为前后两个 clip 时间的中间值
    const prevClip = existingClips[insertAt - 1]
    const nextClip = existingClips[insertAt]
    const midTime = (prevClip.createdAt.getTime() + nextClip.createdAt.getTime()) / 2
    newCreatedAt = new Date(midTime)
  }

  // 使用事务创建 Clip + Storyboard + Panel
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建新的 Clip（手动添加类型）
    const newClip = await tx.novelPromotionClip.create({
      data: {
        episodeId,
        summary: '手动添加的分镜组',
        content: '',
        location: null,
        characters: null,
        createdAt: newCreatedAt
      }
    })

    // 2. 创建关联的 Storyboard
    const newStoryboard = await tx.novelPromotionStoryboard.create({
      data: {
        episodeId,
        clipId: newClip.id,
        panelCount: 1
      }
    })

    // 3. 创建初始的 Panel
    const newPanel = await tx.novelPromotionPanel.create({
      data: {
        storyboardId: newStoryboard.id,
        panelIndex: 0,
        panelNumber: 1,
        shotType: '中景',
        cameraMove: '固定',
        description: '新镜头描述',
        characters: '[]'
      }
    })

    return { clip: newClip, storyboard: newStoryboard, panel: newPanel }
  })

  _ulogInfo(`[添加分镜组] episodeId=${episodeId}, clipId=${result.clip.id}, storyboardId=${result.storyboard.id}, insertAt=${insertAt}`)

  return NextResponse.json({
    success: true,
    clip: result.clip,
    storyboard: result.storyboard,
    panel: result.panel
  })
})

/**
 * PUT /api/novel-promotion/[projectId]/storyboard-group
 * 调整分镜组顺序（通过修改 clip 的 createdAt）
 * - adjacent: { episodeId, clipId, direction: 'up'|'down' }
 * - drag:     { episodeId, clipId, overClipId }
 */
export const PUT = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  // 🔐 统一权限验证
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json()
  const { episodeId, clipId, direction, overClipId } = body as {
    episodeId?: string
    clipId?: string
    direction?: 'up' | 'down'
    overClipId?: string
  }

  if (!episodeId || !clipId || (!direction && !overClipId)) {
    throw new ApiError('INVALID_PARAMS')
  }

  // 获取剧集和所有 clips（按 createdAt 排序）
  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
    include: {
      novelPromotionProject: { select: { projectId: true } },
      clips: { orderBy: { createdAt: 'asc' } }
    }
  })

  if (!episode || episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  const clips = episode.clips
  const orderedIds = clips.map((clip) => clip.id)
  const currentIndex = orderedIds.findIndex((id) => id === clipId)

  if (currentIndex === -1) {
    throw new ApiError('NOT_FOUND')
  }

  // Drag reorder: reassign ascending createdAt timeline onto nextOrder
  if (typeof overClipId === 'string' && overClipId.length > 0) {
    const drag = resolveClipDragReorder(orderedIds, clipId, overClipId)
    if (!drag) {
      throw new ApiError('INVALID_PARAMS')
    }
    const updates = buildClipCreatedAtUpdates(clips, drag.nextOrder)
    if (!updates) {
      throw new ApiError('INVALID_PARAMS')
    }

    await prisma.$transaction(async (tx) => {
      // Park all to unique temp times so final writes never collide mid-tx
      for (let i = 0; i < updates.length; i++) {
        await tx.novelPromotionClip.update({
          where: { id: updates[i]!.id },
          data: { createdAt: new Date(i + 1) },
        })
      }
      for (const update of updates) {
        await tx.novelPromotionClip.update({
          where: { id: update.id },
          data: { createdAt: update.createdAt },
        })
      }
    })

    _ulogInfo(
      `[拖拽分镜组] clipId=${clipId}, overClipId=${overClipId}, ${drag.fromIndex} -> ${drag.toIndex}`,
    )
    return NextResponse.json({ success: true })
  }

  // Adjacent swap (Earlier / Later buttons)
  if (direction !== 'up' && direction !== 'down') {
    throw new ApiError('INVALID_PARAMS')
  }

  const adjacent = resolveAdjacentClipMove(orderedIds, clipId, direction)
  if (!adjacent) {
    throw new ApiError('INVALID_PARAMS')
  }

  const currentClip = clips[adjacent.fromIndex]!
  const targetClip = clips[adjacent.toIndex]!

  const tempTime = currentClip.createdAt.getTime()
  const targetTime = targetClip.createdAt.getTime()

  await prisma.$transaction(async (tx) => {
    await tx.novelPromotionClip.update({
      where: { id: currentClip.id },
      data: { createdAt: new Date(0) },
    })

    await tx.novelPromotionClip.update({
      where: { id: targetClip.id },
      data: { createdAt: new Date(tempTime) },
    })

    await tx.novelPromotionClip.update({
      where: { id: currentClip.id },
      data: { createdAt: new Date(targetTime) },
    })
  })

  _ulogInfo(
    `[移动分镜组] clipId=${clipId}, direction=${direction}, ${adjacent.fromIndex} -> ${adjacent.toIndex}`,
  )

  return NextResponse.json({ success: true })
})

/**
 * DELETE /api/novel-promotion/[projectId]/storyboard-group
 * 删除整个分镜组（Clip + Storyboard + 所有 Panels）
 */
export const DELETE = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  // 🔐 统一权限验证
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const { searchParams } = new URL(request.url)
  const storyboardId = searchParams.get('storyboardId')

  if (!storyboardId) {
    throw new ApiError('INVALID_PARAMS')
  }

  // 获取 storyboard 及其关联的 clip / 项目归属
  const storyboard = await prisma.novelPromotionStoryboard.findUnique({
    where: { id: storyboardId },
    include: {
      panels: true,
      clip: true,
      episode: {
        include: {
          novelPromotionProject: { select: { projectId: true } },
        },
      },
    }
  })

  if (!storyboard || storyboard.episode.novelPromotionProject.projectId !== projectId) {
    throw new ApiError('NOT_FOUND')
  }

  // 使用事务删除（Prisma 的 cascade 会自动处理关联删除，但我们显式删除以确保一致性）
  await prisma.$transaction(async (tx) => {
    await clearVoiceLineMatchesForStoryboard(tx, {
      id: storyboard.id,
      panels: storyboard.panels.map((panel) => ({ id: panel.id })),
    })

    // 1. 删除所有关联的 Panels
    await tx.novelPromotionPanel.deleteMany({
      where: { storyboardId }
    })

    // 2. 删除 Storyboard
    await tx.novelPromotionStoryboard.delete({
      where: { id: storyboardId }
    })

    // 3. 删除关联的 Clip（如果存在）
    if (storyboard.clipId) {
      await tx.novelPromotionClip.delete({
        where: { id: storyboard.clipId }
      })
    }
  })

  _ulogInfo(`[删除分镜组] storyboardId=${storyboardId}, clipId=${storyboard.clipId}, panelCount=${storyboard.panels.length}`)

  return NextResponse.json({ success: true })
})
