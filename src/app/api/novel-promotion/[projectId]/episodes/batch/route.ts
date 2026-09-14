/**
 * 批量创建剧集 API
 *
 * - clearExisting + 写入在同一事务中，避免删库后创建失败导致数据清空
 * - 分片 createMany，支持上千集长正文
 * - novelText 需为 LONGTEXT（见 migration episode_novel_text_longtext）
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { logInfo as _ulogInfo, logError as _ulogError } from '@/lib/logging/core'

interface BatchEpisode {
  name: string
  description?: string
  novelText?: string
}

const CREATE_CHUNK = 40
const TX_TIMEOUT_MS = 5 * 60 * 1000

function normalizeName(raw: string, fallbackIndex: number): string {
  const name = (raw || '').trim() || `第 ${fallbackIndex} 集`
  return name.slice(0, 512)
}

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const { episodes, clearExisting = false, importStatus } = await request.json()

  if (!episodes || !Array.isArray(episodes)) {
    throw new ApiError('INVALID_PARAMS')
  }

  const project = await prisma.novelPromotionProject.findFirst({
    where: { projectId },
  })

  if (!project) {
    throw new ApiError('NOT_FOUND')
  }

  if (episodes.length === 0) {
    if (clearExisting) {
      await prisma.$transaction(async (tx) => {
        await tx.novelPromotionEpisode.deleteMany({
          where: { novelPromotionProjectId: project.id },
        })
        if (importStatus) {
          await tx.novelPromotionProject.update({
            where: { id: project.id },
            data: { importStatus, lastEpisodeId: null },
          })
        }
      })
    } else if (importStatus) {
      await prisma.novelPromotionProject.update({
        where: { id: project.id },
        data: { importStatus },
      })
    }

    return NextResponse.json({
      success: true,
      episodes: [],
      message: clearExisting ? '已清空剧集' : '已更新导入状态',
    })
  }

  const prepared = (episodes as BatchEpisode[]).map((ep, idx) => ({
    name: normalizeName(ep.name, idx + 1),
    description: ep.description?.trim() ? ep.description : null,
    novelText: typeof ep.novelText === 'string' ? ep.novelText : '',
  }))

  try {
    const createdMeta = await prisma.$transaction(async (tx) => {
      if (clearExisting) {
        await tx.novelPromotionEpisode.deleteMany({
          where: { novelPromotionProjectId: project.id },
        })
      }

      const lastEpisode = clearExisting
        ? null
        : await tx.novelPromotionEpisode.findFirst({
          where: { novelPromotionProjectId: project.id },
          orderBy: { episodeNumber: 'desc' },
          select: { episodeNumber: true },
        })

      const startNumber = clearExisting ? 1 : (lastEpisode?.episodeNumber || 0) + 1
      const rows: Array<{ id: string; episodeNumber: number; name: string }> = []

      for (let offset = 0; offset < prepared.length; offset += CREATE_CHUNK) {
        const chunk = prepared.slice(offset, offset + CREATE_CHUNK)
        const data = chunk.map((ep, idx) => {
          const episodeNumber = startNumber + offset + idx
          const id = randomUUID()
          rows.push({ id, episodeNumber, name: ep.name })
          return {
            id,
            novelPromotionProjectId: project.id,
            episodeNumber,
            name: ep.name,
            description: ep.description,
            novelText: ep.novelText,
          }
        })

        await tx.novelPromotionEpisode.createMany({ data })
      }

      const updateData: { lastEpisodeId: string; importStatus?: string } = {
        lastEpisodeId: rows[0].id,
      }
      if (importStatus) {
        updateData.importStatus = importStatus
      }

      await tx.novelPromotionProject.update({
        where: { id: project.id },
        data: updateData,
      })

      return rows
    }, {
      maxWait: 60_000,
      timeout: TX_TIMEOUT_MS,
    })

    _ulogInfo('[episodes/batch] saved', {
      projectId,
      count: createdMeta.length,
      clearExisting,
      importStatus,
    })

    return NextResponse.json({
      success: true,
      episodes: createdMeta,
    })
  } catch (err: unknown) {
    _ulogError('[episodes/batch] failed', {
      projectId,
      count: prepared.length,
      clearExisting,
      message: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
})
