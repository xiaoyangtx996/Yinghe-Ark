export type VendorProbeStepStatus = 'pass' | 'fail' | 'skip'

export type VendorProbeStep = {
  name: string
  status: VendorProbeStepStatus
  message: string
  model?: string
  detail?: string
}

export type VendorProbeSummary = 'passed' | 'failed' | 'partial' | 'testing' | 'idle'

export function resolveVendorProbeSummary(
  status: 'idle' | 'testing' | 'passed' | 'failed',
  steps: readonly VendorProbeStep[],
): VendorProbeSummary {
  if (status === 'testing') return 'testing'
  if (status === 'idle' && steps.length === 0) return 'idle'
  if (status === 'passed') return 'passed'
  if (status === 'failed') {
    const hasPass = steps.some((step) => step.status === 'pass')
    return hasPass ? 'partial' : 'failed'
  }
  if (steps.some((step) => step.status === 'fail')) {
    return steps.some((step) => step.status === 'pass') ? 'partial' : 'failed'
  }
  if (steps.length > 0) return 'passed'
  return 'idle'
}

/** Strip common secret shapes from vendor error bodies before UI / logs. */
export function redactSensitiveText(input: string): string {
  let out = input
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-+=/]+/gi, 'Bearer [REDACTED]')
  out = out.replace(/\bsk-[A-Za-z0-9]{8,}\b/g, 'sk-[REDACTED]')
  out = out.replace(/\bAIza[A-Za-z0-9_\-]{20,}\b/g, '[REDACTED_KEY]')
  out = out.replace(
    /([?&](?:api[_-]?key|key|token|access_token)=)([^&\s"']+)/gi,
    '$1[REDACTED]',
  )
  out = out.replace(
    /("?(?:api[_-]?key|apiKey|token|access_token|authorization)"?\s*[:=]\s*")([^"]+)(")/gi,
    '$1[REDACTED]$3',
  )
  out = out.replace(
    /("?(?:api[_-]?key|apiKey|token|access_token|authorization)"?\s*[:=]\s*')([^']+)(')/gi,
    '$1[REDACTED]$3',
  )
  return out
}

export function sanitizeVendorProbeStep<T extends { message?: string; detail?: string }>(step: T): T {
  return {
    ...step,
    ...(typeof step.message === 'string' ? { message: redactSensitiveText(step.message) } : {}),
    ...(typeof step.detail === 'string' ? { detail: redactSensitiveText(step.detail) } : {}),
  }
}

export function sanitizeVendorProbeSteps<T extends { message?: string; detail?: string }>(
  steps: readonly T[],
): T[] {
  return steps.map((step) => sanitizeVendorProbeStep(step))
}
