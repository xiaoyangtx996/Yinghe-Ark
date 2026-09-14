import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { attachMediaFieldsToProject } from '@/lib/media/attach'

function readAssetKind(value: Record<string, unknown>): string {
    return typeof value.assetKind === 'string' ? value.assetKind : 'location'
}

/**
 * ⚡ 延迟加载 API - 获取项目的 characters 和 locations 资产
 * 用于资产管理页面，避免首次加载时的性能开销
 */
export const GET = apiHandler(async (
    _request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) => {
    const { projectId } = await context.params

    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    const novelPromotionData = await prisma.novelPromotionProject.findUnique({
        where: { projectId },
        select: {
            id: true,
            characters: {
                include: { appearances: { orderBy: { appearanceIndex: 'asc' } } },
                orderBy: { createdAt: 'asc' },
            },
            locations: {
                include: { images: { orderBy: { imageIndex: 'asc' } } },
                orderBy: { createdAt: 'asc' },
            },
        },
    })

    if (!novelPromotionData) {
        throw new ApiError('NOT_FOUND')
    }

    const dataWithSignedUrls = await attachMediaFieldsToProject({
        characters: novelPromotionData.characters,
        locations: novelPromotionData.locations,
    })

    const locations = (dataWithSignedUrls.locations || []).filter((item) => readAssetKind(item) !== 'prop')
    const props = (dataWithSignedUrls.locations || []).filter((item) => readAssetKind(item) === 'prop')

    return NextResponse.json({
        characters: dataWithSignedUrls.characters || [],
        locations,
        props,
    })
})
