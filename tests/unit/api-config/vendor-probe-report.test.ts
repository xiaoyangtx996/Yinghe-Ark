import { describe, expect, it } from 'vitest'
import {
  redactSensitiveText,
  resolveVendorProbeSummary,
  sanitizeVendorProbeStep,
} from '@/lib/user-api/vendor-probe-summary'

describe('resolveVendorProbeSummary', () => {
  it('marks partial failure when some steps pass and status failed', () => {
    expect(
      resolveVendorProbeSummary('failed', [
        { name: 'models', status: 'pass', message: 'ok' },
        { name: 'imageGen', status: 'fail', message: 'timeout', detail: '403' },
      ]),
    ).toBe('partial')
  })

  it('marks passed when status passed', () => {
    expect(
      resolveVendorProbeSummary('passed', [
        { name: 'models', status: 'pass', message: 'ok' },
      ]),
    ).toBe('passed')
  })

  it('marks testing while in progress', () => {
    expect(resolveVendorProbeSummary('testing', [])).toBe('testing')
  })
})

describe('redactSensitiveText', () => {
  it('redacts bearer tokens, sk keys, and api_key query values', () => {
    expect(redactSensitiveText('Authorization: Bearer tok_abc.def-123')).toContain('Bearer [REDACTED]')
    expect(redactSensitiveText('invalid key sk-abcdefghijklmnop')).toContain('sk-[REDACTED]')
    expect(redactSensitiveText('url=?api_key=supersecret&x=1')).toContain('api_key=[REDACTED]')
    expect(redactSensitiveText('url=?api_key=supersecret&x=1')).not.toContain('supersecret')
    expect(redactSensitiveText('{"apiKey":"abc123"}')).toContain('"apiKey":"[REDACTED]"')
  })

  it('keeps ordinary error text', () => {
    expect(redactSensitiveText('Provider error (429) rate limited')).toBe(
      'Provider error (429) rate limited',
    )
  })
})

describe('sanitizeVendorProbeStep', () => {
  it('redacts message and detail', () => {
    const step = sanitizeVendorProbeStep({
      name: 'models',
      status: 'fail' as const,
      message: 'Auth Bearer tok_abc123xyz',
      detail: 'sk-abcdefghijklmnop',
    })
    expect(step.message).toContain('Bearer [REDACTED]')
    expect(step.detail).toBe('sk-[REDACTED]')
  })
})
