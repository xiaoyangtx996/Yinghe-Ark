import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { toMoneyNumber } from '@/lib/billing/money'
import { isArtStyleValue } from '@/lib/constants'
import { resolveTaskLocale } from '@/lib/task/resolve-locale'
import {
  formatProjectValidationIssue,
  normalizeProjectDraft,
  validateProjectDraft,
  type ProjectDraftInput,
} from '@/lib/projects/validation'
import {
  buildEmptyProjectListStats,
  loadProjectListStats,
} from '@/lib/projects/list-stats'
import { PROJECT_ACCESS_ORDER_BY_SQL } from '@/lib/projects/list-order'
import { Prisma } from '@prisma/client'

function readProjectDraftBody(body: unknown): ProjectDraftInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { name: '' }
  }

  const payload = body as Record<string, unknown>
  return {
    name: typeof payload.name === 'string' ? payload.name : '',
    description: typeof payload.description === 'string' ? payload.description : null,
  }
}

// GET - 获取用户的项目（支持分页和搜索）
export const GET = apiHandler(async (request: NextRequest) => {
  // 🔐 统一权限验证
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '12', 10)
  const search = searchParams.get('search') || ''

  const where: Prisma.ProjectWhereInput = { userId: session.user.id }

  if (search.trim()) {
    where.OR = [
      { name: { contains: search.trim() } },
      { description: { contains: search.trim() } },
    ]
  }

  const offset = (page - 1) * pageSize
  const searchTrim = search.trim()

  // Cross-page order must match compareProjectsByAccessRecency (not page-local re-sort).
  const [total, idRows] = await Promise.all([
    prisma.project.count({ where }),
    searchTrim
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM projects
          WHERE userId = ${session.user.id}
            AND (name LIKE ${`%${searchTrim}%`} OR description LIKE ${`%${searchTrim}%`})
          ORDER BY ${Prisma.raw(PROJECT_ACCESS_ORDER_BY_SQL)}
          LIMIT ${pageSize} OFFSET ${offset}
        `
      : prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM projects
          WHERE userId = ${session.user.id}
          ORDER BY ${Prisma.raw(PROJECT_ACCESS_ORDER_BY_SQL)}
          LIMIT ${pageSize} OFFSET ${offset}
        `,
  ])

  const orderedIds = idRows.map((row) => row.id)
  const projectRows =
    orderedIds.length === 0
      ? []
      : await prisma.project.findMany({
          where: { id: { in: orderedIds } },
        })
  const byId = new Map(projectRows.map((p) => [p.id, p]))
  const projects = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const projectIds = projects.map((p) => p.id)

  const [costsByProject, { statsMap, genrePackMap }] = await Promise.all([
    prisma.usageCost.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _sum: { cost: true },
    }),
    loadProjectListStats(projectIds),
  ])

  const costMap = new Map(
    costsByProject.map((item) => [item.projectId, toMoneyNumber(item._sum.cost)]),
  )

  const projectsWithStats = projects.map((project) => ({
    ...project,
    totalCost: costMap.get(project.id) ?? 0,
    genrePack: genrePackMap.get(project.id) ?? null,
    stats: statsMap.get(project.id) ?? buildEmptyProjectListStats(),
  }))

  return NextResponse.json({
    projects: projectsWithStats,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  })
})

// POST - 创建新项目
export const POST = apiHandler(async (request: NextRequest) => {
  // 🔐 统一权限验证
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json()
  const draft = readProjectDraftBody(body)
  const validationIssue = validateProjectDraft(draft)
  if (validationIssue) {
    const locale = resolveTaskLocale(request, body) ?? 'zh'
    throw new ApiError('INVALID_PARAMS', {
      code: validationIssue.code,
      field: validationIssue.field,
      ...(typeof validationIssue.limit === 'number' ? { limit: validationIssue.limit } : {}),
      message: formatProjectValidationIssue(validationIssue, locale),
    })
  }

  const { name, description } = normalizeProjectDraft(draft)

  // 获取用户偏好配置
  const userPreference = await prisma.userPreference.findUnique({
    where: { userId: session.user.id }
  })

  // 创建基础项目
  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      userId: session.user.id
    }
  })

  // 创建 novel-promotion 数据表，使用用户偏好作为默认值
  // 注意：不再自动创建默认剧集，由用户在选择界面决定：
  // - 手动创作 → 创建第一个空白剧集
  // - 智能导入 → AI 分析后批量创建剧集
  // 🔥 artStylePrompt 通过实时查询获取，不再存储到数据库
  await prisma.novelPromotionProject.create({
    data: {
      projectId: project.id,
      ...(userPreference && {
        analysisModel: userPreference.analysisModel,
        characterModel: userPreference.characterModel,
        locationModel: userPreference.locationModel,
        storyboardModel: userPreference.storyboardModel,
        editModel: userPreference.editModel,
        videoModel: userPreference.videoModel,
        audioModel: userPreference.audioModel,
        videoRatio: userPreference.videoRatio,
        artStyle: isArtStyleValue(userPreference.artStyle) ? userPreference.artStyle : 'american-comic',
        ttsRate: userPreference.ttsRate
      })
    }
  })

  return NextResponse.json({ project }, { status: 201 })
})
