import { NextRequest, NextResponse } from 'next/server'
import { getProjectCostDetails } from '@/lib/billing/reporting'
import { BILLING_CURRENCY } from '@/lib/billing/currency'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'

/**
 * GET /api/projects/[projectId]/costs
 * 获取项目费用详情
 */
export const GET = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { project } = authResult

  const costDetails = await getProjectCostDetails(projectId)

  return NextResponse.json({
    projectId,
    projectName: project.name,
    currency: BILLING_CURRENCY,
    ...costDetails,
  })
})
