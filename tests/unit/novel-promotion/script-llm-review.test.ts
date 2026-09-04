import { describe, expect, it } from 'vitest'
import {
  buildScriptLlmReviewClipPayload,
  buildScriptLlmReviewSystemPrompt,
  parseScriptLlmReviewResponse,
} from '@/lib/novel-promotion/script-llm-review'

describe('buildScriptLlmReviewClipPayload', () => {
  it('normalizes characters/location and truncates long content', () => {
    const payload = buildScriptLlmReviewClipPayload([
      {
        id: 'c1',
        summary: '开场',
        content: '甲'.repeat(900),
        characters: '["甲"]',
        location: '公寓',
      },
    ])
    expect(payload).toHaveLength(1)
    expect(payload[0]?.characters).toEqual(['甲'])
    expect(payload[0]?.location).toBe('公寓')
    expect(payload[0]?.content.endsWith('…')).toBe(true)
    expect(payload[0]?.content.length).toBeLessThanOrEqual(801)
  })
})

describe('buildScriptLlmReviewSystemPrompt', () => {
  it('includes gate ids without craft STY codes', () => {
    const prompt = buildScriptLlmReviewSystemPrompt()
    expect(prompt).toContain('opening_pressure')
    expect(prompt).toContain('want_vs_block')
    expect(prompt).not.toMatch(/STY|SCR/)
  })
})

describe('parseScriptLlmReviewResponse', () => {
  it('parses findings and drops invalid gate ids', () => {
    const findings = parseScriptLlmReviewResponse(
      JSON.stringify({
        findings: [
          {
            gateId: 'opening_pressure',
            severity: 'warn',
            title: '开场偏软',
            detail: '第一段缺少可见压力。',
            clipIds: ['c1'],
          },
          {
            gateId: 'STY_FAKE',
            severity: 'info',
            title: '可忽略的维度',
            detail: '不应保留假 gate',
            clipIds: [],
          },
          {
            severity: 'nope',
            title: '',
            detail: '',
          },
        ],
      }),
    )

    expect(findings).toHaveLength(2)
    expect(findings[0]).toEqual({
      gateId: 'opening_pressure',
      severity: 'warn',
      title: '开场偏软',
      detail: '第一段缺少可见压力。',
      clipIds: ['c1'],
    })
    expect(findings[1]?.gateId).toBeNull()
    expect(findings[1]?.severity).toBe('info')
  })

  it('extracts JSON from fenced model output', () => {
    const findings = parseScriptLlmReviewResponse(
      '好的。\n```json\n{"findings":[{"gateId":null,"severity":"info","title":"OK","detail":"暂无明显问题","clipIds":[]}]}\n```',
    )
    expect(findings).toEqual([
      {
        gateId: null,
        severity: 'info',
        title: 'OK',
        detail: '暂无明显问题',
        clipIds: [],
      },
    ])
  })

  it('returns empty array on garbage', () => {
    expect(parseScriptLlmReviewResponse('not json')).toEqual([])
  })
})
