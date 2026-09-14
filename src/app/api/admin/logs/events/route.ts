import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { queryAuditLogEvents, type AuditLogKind } from '@/lib/logging/file-writer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/logs/events?kind=login|operation&limit=100
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult

  const { searchParams } = new URL(request.url)
  const kindParam = searchParams.get('kind')
  const kind: AuditLogKind = kindParam === 'login' ? 'login' : 'operation'
  const limitRaw = Number.parseInt(searchParams.get('limit') || '100', 10)
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100

  const result = await queryAuditLogEvents({ kind, limit })
  return NextResponse.json(result)
})
