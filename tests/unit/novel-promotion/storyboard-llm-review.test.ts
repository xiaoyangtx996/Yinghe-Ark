import { describe, expect, it } from 'vitest'
import {
  buildStoryboardLlmReviewPanelPayload,
  buildStoryboardLlmReviewSystemPrompt,
  parseStoryboardLlmReviewResponse,
} from '@/lib/novel-promotion/storyboard-llm-review'

describe('buildStoryboardLlmReviewPanelPayload', () => {
  it('flattens panels and marks hasImage without sending urls', () => {
    const panels = buildStoryboardLlmReviewPanelPayload([
      {
        id: 'b1',
        panels: [
          {
            id: 'p1',
            description: '特写：甲握拳',
            imagePrompt: 'close-up fist',
            imageUrl: 'https://example.com/a.png',
            characters: '["甲"]',
            location: '公寓',
          },
          {
            id: 'p2',
            description: '中景',
            imageUrl: null,
          },
        ],
      },
    ])
    expect(panels).toHaveLength(2)
    expect(panels[0]).toMatchObject({
      id: 'p1',
      boardId: 'b1',
      hasImage: true,
      location: '公寓',
    })
    expect(panels[0]).not.toHaveProperty('imageUrl')
    expect(panels[1]?.hasImage).toBe(false)
  })
})

describe('buildStoryboardLlmReviewSystemPrompt', () => {
  it('includes gate ids without craft codes', () => {
    const prompt = buildStoryboardLlmReviewSystemPrompt()
    expect(prompt).toContain('shot_purpose')
    expect(prompt).toContain('images_ready')
    expect(prompt).not.toMatch(/VID|REV/)
  })
})

describe('parseStoryboardLlmReviewResponse', () => {
  it('parses findings and nulls invalid gate ids', () => {
    const findings = parseStoryboardLlmReviewResponse(
      JSON.stringify({
        findings: [
          {
            gateId: 'still_keyframe',
            severity: 'warn',
            title: '描述像过程',
            detail: '出现「先再最后」，不像静帧。',
            panelIds: ['p1'],
          },
          {
            gateId: 'VID_FAKE',
            severity: 'info',
            title: '其它',
            detail: '假维度',
            panelIds: [],
          },
        ],
      }),
    )
    expect(findings).toHaveLength(2)
    expect(findings[0]?.gateId).toBe('still_keyframe')
    expect(findings[1]?.gateId).toBeNull()
  })

  it('returns empty on garbage', () => {
    expect(parseStoryboardLlmReviewResponse('nope')).toEqual([])
  })
})
