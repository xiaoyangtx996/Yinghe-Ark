import { describe, expect, it } from 'vitest'
import { resolveWorkspaceStage } from '@/lib/workspace/resolve-workspace-stage'

describe('resolveWorkspaceStage', () => {
  it('keeps editor as editor instead of remapping to videos', () => {
    expect(resolveWorkspaceStage('editor')).toBe('editor')
  })

  it('returns config when stage is missing or invalid', () => {
    expect(resolveWorkspaceStage(null)).toBe('config')
    expect(resolveWorkspaceStage(undefined)).toBe('config')
    expect(resolveWorkspaceStage('unknown')).toBe('config')
  })

  it('passes through known product stages', () => {
    expect(resolveWorkspaceStage('videos')).toBe('videos')
    expect(resolveWorkspaceStage('storyboard')).toBe('storyboard')
  })
})
