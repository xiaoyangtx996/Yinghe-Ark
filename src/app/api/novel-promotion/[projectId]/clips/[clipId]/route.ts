import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireClipOwnedByProject } from '@/lib/novel-promotion/resource-ownership'

/**
 * PATCH /api/novel-promotion/[projectId]/clips/[clipId]
 * 更新单个 Clip 的信息
 * 支持更新：characters, location, props, content, screenplay
 */
export const PATCH = apiHandler(async (
    request: NextRequest,
    context: { params: Promise<{ projectId: string; clipId: string }> }
) => {
    const { projectId, clipId } = await context.params

    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    await requireClipOwnedByProject(clipId, projectId)

    const body = await request.json()
    const { characters, location, props, content, screenplay } = body

    const updateData: {
        characters?: string | null
        location?: string | null
        props?: string | null
        content?: string
        screenplay?: string | null
    } = {}
    if (characters !== undefined) updateData.characters = characters
    if (location !== undefined) updateData.location = location
    if (props !== undefined) updateData.props = props
    if (content !== undefined) updateData.content = content
    if (screenplay !== undefined) updateData.screenplay = screenplay

    if (Object.keys(updateData).length === 0) {
        throw new ApiError('INVALID_PARAMS')
    }

    const clip = await prisma.novelPromotionClip.update({
        where: { id: clipId },
        data: updateData
    })

    return NextResponse.json({ success: true, clip })
})
