import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { ApiError, apiHandler } from '@/lib/api-errors'

const FOLDER_KINDS = new Set(['character', 'location', 'voice', 'sfx'])

// 获取用户所有文件夹
export const GET = apiHandler(async (request: NextRequest) => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const { session } = authResult

    const kindParam = request.nextUrl.searchParams.get('kind')
    const folders = await prisma.globalAssetFolder.findMany({
        where: {
            userId: session.user.id,
            ...(kindParam && FOLDER_KINDS.has(kindParam)
                ? { OR: [{ kind: kindParam }, { kind: null }] }
                : {}),
        },
        orderBy: { name: 'asc' },
    })

    return NextResponse.json({ folders })
})

// 创建文件夹
export const POST = apiHandler(async (request: NextRequest) => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const { session } = authResult

    const body = await request.json()
    const { name, kind } = body

    if (!name?.trim()) {
        throw new ApiError('INVALID_PARAMS')
    }

    if (kind != null && !FOLDER_KINDS.has(kind)) {
        throw new ApiError('INVALID_PARAMS')
    }

    const folder = await prisma.globalAssetFolder.create({
        data: {
            userId: session.user.id,
            name: name.trim(),
            kind: kind ?? null,
        },
    })

    return NextResponse.json({ success: true, folder })
})
