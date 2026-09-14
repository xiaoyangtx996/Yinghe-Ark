import { logError as _ulogError } from '@/lib/logging/core'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'

/**
 * 统一的项目数据加载API（shell）
 * 返回项目基础信息、全局配置、资产计数。
 * 剧集索引请走 GET /api/novel-promotion/:id/episodes?view=index。
 * 签名资产请走 GET /api/assets?scope=project。
 */
export const GET = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  // Ownership first; project shell fields come from auth (single project round-trip).
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { project: ownedProject } = authResult

  const novelPromotionData = await prisma.novelPromotionProject.findUnique({
    where: { projectId },
    select: {
      id: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
      analysisModel: true,
      imageModel: true,
      videoModel: true,
      audioModel: true,
      videoRatio: true,
      ttsRate: true,
      globalAssetText: true,
      artStyle: true,
      artStylePrompt: true,
      genrePack: true,
      characterModel: true,
      locationModel: true,
      storyboardModel: true,
      editModel: true,
      videoResolution: true,
      capabilityOverrides: true,
      workflowMode: true,
      lastEpisodeId: true,
      imageResolution: true,
      importStatus: true,
      _count: {
        select: {
          episodes: true,
          characters: true,
          locations: true,
        },
      },
    },
  })

  if (!novelPromotionData) {
    throw new ApiError('NOT_FOUND')
  }

  prisma.project.update({
    where: { id: projectId },
    data: { lastAccessedAt: new Date() },
  }).catch((err) => _ulogError('更新访问时间失败:', err))

  const { _count, ...novelConfig } = novelPromotionData
  const filteredNovelPromotionData = {
    ...novelConfig,
    // Assets are loaded via /api/assets; keep empty arrays for type compatibility.
    characters: [],
    locations: [],
    props: [],
    // Episode index is loaded separately (columnar view=index).
    episodes: [],
    episodeCount: _count?.episodes ?? 0,
    characterCount: _count?.characters ?? 0,
    locationCount: _count?.locations ?? 0,
  }

  const fullProject = {
    id: ownedProject.id,
    userId: ownedProject.userId,
    name: ownedProject.name,
    description: ownedProject.description ?? null,
    createdAt: ownedProject.createdAt,
    updatedAt: ownedProject.updatedAt,
    lastAccessedAt: ownedProject.lastAccessedAt,
    novelPromotionData: filteredNovelPromotionData,
  }

  return NextResponse.json({ project: fullProject })
})
