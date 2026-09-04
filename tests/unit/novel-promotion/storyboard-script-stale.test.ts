import { describe, expect, it } from 'vitest'
import {
  STORYBOARD_SCRIPT_STALE_MERGED,
  isStoryboardScriptStale,
  resolveStoryboardErrorPresentation,
} from '@/lib/novel-promotion/storyboard-script-stale'

describe('isStoryboardScriptStale', () => {
  it('detects merge marker', () => {
    expect(isStoryboardScriptStale(STORYBOARD_SCRIPT_STALE_MERGED)).toBe(true)
    expect(isStoryboardScriptStale('timeout')).toBe(false)
    expect(isStoryboardScriptStale(null)).toBe(false)
  })
})

describe('resolveStoryboardErrorPresentation', () => {
  it('separates stale from real failures', () => {
    expect(resolveStoryboardErrorPresentation(STORYBOARD_SCRIPT_STALE_MERGED)).toEqual({
      scriptStale: true,
      failedError: null,
    })
    expect(resolveStoryboardErrorPresentation('生成失败')).toEqual({
      scriptStale: false,
      failedError: '生成失败',
    })
    expect(resolveStoryboardErrorPresentation(null)).toEqual({
      scriptStale: false,
      failedError: null,
    })
  })
})
