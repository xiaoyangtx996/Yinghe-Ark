import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, AUTH_LOGIN_LIMIT } from '@/lib/rate-limit'
import { logAuthAction } from '@/lib/logging/semantic'

/**
 * POST /api/user/password
 * 修改当前登录用户密码
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const ip = getClientIp(request)
  const rateResult = await checkRateLimit('auth:change-password', ip, AUTH_LOGIN_LIMIT)
  if (rateResult.limited) {
    return NextResponse.json(
      { success: false, message: `请求过于频繁，请 ${rateResult.retryAfterSeconds} 秒后再试` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateResult.retryAfterSeconds) },
      },
    )
  }

  const body = await request.json() as {
    currentPassword?: unknown
    newPassword?: unknown
  }
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    throw new ApiError('INVALID_PARAMS')
  }
  if (newPassword.length < 6) {
    throw new ApiError('INVALID_PARAMS')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, password: true },
  })

  if (!user?.password) {
    logAuthAction('CHANGE_PASSWORD', user?.name || session.user.id, { error: 'No password set' })
    throw new ApiError('INVALID_PARAMS', { message: '当前账户未设置密码' })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    logAuthAction('CHANGE_PASSWORD', user.name, { error: 'Wrong current password' })
    throw new ApiError('UNAUTHORIZED', { message: '当前密码不正确' })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  logAuthAction('CHANGE_PASSWORD', user.name, { userId: user.id, success: true })

  return NextResponse.json({ success: true })
})
