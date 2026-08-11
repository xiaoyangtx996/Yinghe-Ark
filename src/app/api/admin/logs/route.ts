import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { getLogFilesList, readLogFile } from '@/lib/logging/file-writer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/logs
 * - no query: list log files
 * - ?name=app.log: preview content (tail if large)
 * - ?name=app.log&download=1: download that file
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const download = searchParams.get('download') === '1'

  if (!name) {
    const files = await getLogFilesList()
    return NextResponse.json({ files })
  }

  const file = await readLogFile(name, download ? 0 : 512 * 1024)
  if (!file) {
    return NextResponse.json({ error: 'Log file not found' }, { status: 404 })
  }

  if (download) {
    return new NextResponse(file.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    })
  }

  return NextResponse.json(file)
})
