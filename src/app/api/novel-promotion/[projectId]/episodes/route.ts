import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireProjectAuth, requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { encodeEpisodeIndex } from '@/lib/projects/episode-index'
import {
  applyEpisodeIndexQuery,
  parseEpisodeIndexQuery,
  resolveFocusWindowOffset,
} from '@/lib/projects/episode-index-query'

/**
 * GET - 剧集列表
 * - view=index（默认）：侧栏索引，columnar v2（uuid/base64url + delta n + 标题剥离）
 *   可选 q / offset / limit / focusId
 *   - 无 q 且有 limit：DB skip/take（真分页）
 *   - 有 q：拉全集后内存过滤（侧栏数字语义）
 * - view=full：基础元数据（仍不含 novelText）
 * - view=text：智能导入恢复用（含 description + novelText）
 */
export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params
  const view = request.nextUrl.searchParams.get('view') || 'index'
  const search = request.nextUrl.searchParams

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  // One round-trip: novel shell + episodes (404 if project mode data missing).
  if (view === 'text') {
    const novel = await prisma.novelPromotionProject.findUnique({
      where: { projectId },
      select: {
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          select: {
            id: true,
            episodeNumber: true,
            name: true,
            description: true,
            novelText: true,
          },
        },
      },
    })
    if (!novel) throw new ApiError('NOT_FOUND')
    return NextResponse.json({ view: 'text', episodes: novel.episodes, count: novel.episodes.length })
  }

  if (view === 'index') {
    const query = parseEpisodeIndexQuery({
      q: search.get('q'),
      offset: search.get('offset'),
      limit: search.get('limit'),
      focusId: search.get('focusId'),
    })

    const novel = await prisma.novelPromotionProject.findUnique({
      where: { projectId },
      select: {
        id: true,
        _count: { select: { episodes: true } },
      },
    })
    if (!novel) throw new ApiError('NOT_FOUND')
    const total = novel._count.episodes

    // Search: need full name set for sidebar numeric semantics.
    if (query.q) {
      const episodes = await prisma.novelPromotionEpisode.findMany({
        where: { novelPromotionProjectId: novel.id },
        orderBy: { episodeNumber: 'asc' },
        select: { id: true, episodeNumber: true, name: true },
      })
      const { items, count } = applyEpisodeIndexQuery(episodes, query)
      return NextResponse.json({
        view: 'index',
        episodes: encodeEpisodeIndex(items),
        count,
        total,
        offset: query.offset,
        limit: query.limit,
        q: query.q,
      })
    }

    let offset = query.offset
    const limit = query.limit
    let focusIndex: number | null = null

    if (query.focusId && limit != null && total > 0) {
      const focus = await prisma.novelPromotionEpisode.findFirst({
        where: { id: query.focusId, novelPromotionProjectId: novel.id },
        select: { episodeNumber: true },
      })
      if (focus) {
        focusIndex = await prisma.novelPromotionEpisode.count({
          where: {
            novelPromotionProjectId: novel.id,
            episodeNumber: { lt: focus.episodeNumber },
          },
        })
        offset = resolveFocusWindowOffset(focusIndex, limit, total)
      }
    }

    if (limit == null) {
      const episodes = await prisma.novelPromotionEpisode.findMany({
        where: { novelPromotionProjectId: novel.id },
        orderBy: { episodeNumber: 'asc' },
        select: { id: true, episodeNumber: true, name: true },
      })
      return NextResponse.json({
        view: 'index',
        episodes: encodeEpisodeIndex(episodes),
        count: total,
        total,
        offset: 0,
        limit: null,
      })
    }

    const episodes = await prisma.novelPromotionEpisode.findMany({
      where: { novelPromotionProjectId: novel.id },
      orderBy: { episodeNumber: 'asc' },
      skip: offset,
      take: limit,
      select: { id: true, episodeNumber: true, name: true },
    })

    return NextResponse.json({
      view: 'index',
      episodes: encodeEpisodeIndex(episodes),
      count: total,
      total,
      offset,
      limit,
      focusIndex: focusIndex ?? undefined,
    })
  }

  const novel = await prisma.novelPromotionProject.findUnique({
    where: { projectId },
    select: {
      episodes: {
        orderBy: { episodeNumber: 'asc' },
        select: {
          id: true,
          episodeNumber: true,
          name: true,
          description: true,
          audioUrl: true,
          audioMediaId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })
  if (!novel) throw new ApiError('NOT_FOUND')

  return NextResponse.json({ view: 'full', episodes: novel.episodes, count: novel.episodes.length })
})

/**
 * POST - 创建新剧集
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  // 🔐 统一权限验证
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { novelData } = authResult

  const body = await request.json()
  const { name, description, novelText } = body

  if (!name || name.trim().length === 0) {
    throw new ApiError('INVALID_PARAMS')
  }

  // 获取下一个剧集编号
  const lastEpisode = await prisma.novelPromotionEpisode.findFirst({
    where: { novelPromotionProjectId: novelData.id },
    orderBy: { episodeNumber: 'desc' }
  })
  const nextEpisodeNumber = (lastEpisode?.episodeNumber || 0) + 1

  // 创建剧集
  const createData: Prisma.NovelPromotionEpisodeUncheckedCreateInput = {
    novelPromotionProjectId: novelData.id,
    episodeNumber: nextEpisodeNumber,
    name: name.trim(),
    description: description?.trim() || null,
  }
  if (typeof novelText === 'string') {
    createData.novelText = novelText
  }

  const episode = await prisma.novelPromotionEpisode.create({
    data: createData,
  })

  // 更新最后编辑的剧集ID
  await prisma.novelPromotionProject.update({
    where: { id: novelData.id },
    data: { lastEpisodeId: episode.id }
  })

  return NextResponse.json({ episode }, { status: 201 })
})
