import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getSignedObjectUrl } from '@/lib/storage'

const DEFAULT_EXPIRES_SECONDS = 3600

/**
 * NextResponse.redirect requires absolute URLs. Local storage returns `/api/files/…`,
 * and `nextUrl.origin` can be `http://0.0.0.0:3000` when listening on 0.0.0.0 — browsers
 * cannot follow that. Prefer the request Host header.
 */
function toAbsoluteUrl(request: NextRequest, maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) {
    return maybeRelative.replace('://0.0.0.0', '://localhost')
  }

  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const host = hostHeader && !hostHeader.startsWith('0.0.0.0')
    ? hostHeader
    : (request.nextUrl.host || 'localhost:3000').replace(/^0\.0\.0\.0/, 'localhost')
  const protoHeader = request.headers.get('x-forwarded-proto')
  const proto = (protoHeader || request.nextUrl.protocol.replace(':', '') || 'http').split(',')[0].trim()
  const path = maybeRelative.startsWith('/') ? maybeRelative : `/${maybeRelative}`
  return `${proto}://${host}${path}`
}

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  const expiresRaw = searchParams.get('expires')

  if (!key) {
    throw new ApiError('INVALID_PARAMS')
  }

  const expires = expiresRaw ? Number.parseInt(expiresRaw, 10) : DEFAULT_EXPIRES_SECONDS
  const ttl = Number.isFinite(expires) && expires > 0 ? expires : DEFAULT_EXPIRES_SECONDS

  const signedUrl = await getSignedObjectUrl(key, ttl)
  return NextResponse.redirect(toAbsoluteUrl(request, signedUrl))
})
