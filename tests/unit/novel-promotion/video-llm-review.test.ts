import { describe, expect, it } from 'vitest'
import {
  buildVideoLlmReviewPanelPayload,
  buildVideoLlmReviewSystemPrompt,
  parseVideoLlmReviewResponse,
} from '@/lib/novel-promotion/video-llm-review'

describe('buildVideoLlmReviewPanelPayload', () => {
  it('maps flags without media urls', () => {
    const panels = buildVideoLlmReviewPanelPayload([
      {
        panelId: 'p1',
        imageUrl: 'https://example.com/a.png',
        videoUrl: null,
        videoPrompt: '轻微点头',
        videoErrorMessage: 'timeout',
      },
    ])
    expect(panels[0]).toMatchObject({
      id: 'p1',
      hasImage: true,
      hasVideo: false,
      hasError: true,
      videoPrompt: '轻微点头',
      errorHint: 'timeout',
    })
    expect(panels[0]).not.toHaveProperty('imageUrl')
    expect(panels[0]).not.toHaveProperty('videoUrl')
  })
})

describe('buildVideoLlmReviewSystemPrompt', () => {
  it('includes gate ids without craft codes', () => {
    const prompt = buildVideoLlmReviewSystemPrompt()
    expect(prompt).toContain('motion_from_frame')
    expect(prompt).toContain('playback_ready')
    expect(prompt).not.toMatch(/VID|REV/)
  })
})

describe('parseVideoLlmReviewResponse', () => {
  it('parses findings and nulls invalid gate ids', () => {
    const findings = parseVideoLlmReviewResponse(
      JSON.stringify({
        findings: [
          {
            gateId: 'prompt_focused',
            severity: 'warn',
            title: '提示词过长',
            detail: '像在贴人物小传。',
            panelIds: ['p1'],
          },
          {
            gateId: 'VID_X',
            severity: 'info',
            title: '其它',
            detail: '假维度',
            panelIds: [],
          },
        ],
      }),
    )
    expect(findings).toHaveLength(2)
    expect(findings[0]?.gateId).toBe('prompt_focused')
    expect(findings[1]?.gateId).toBeNull()
  })

  it('returns empty on garbage', () => {
    expect(parseVideoLlmReviewResponse('x')).toEqual([])
  })
})
