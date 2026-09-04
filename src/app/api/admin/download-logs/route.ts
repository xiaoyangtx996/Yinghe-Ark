import { NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { readAllLogs } from '@/lib/logging/file-writer'

export const dynamic = 'force-dynamic'

// GET - 下载所有日志
export const GET = apiHandler(async () => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult

    const logs = await readAllLogs()
    if (!logs) {
        return NextResponse.json({ error: 'No logs available' }, { status: 404 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `yinghe-ark-logs-${timestamp}.txt`

    return new NextResponse(logs, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
})
