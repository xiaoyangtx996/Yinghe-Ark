import { describe, expect, it } from 'vitest'
import { resolveCapsuleActiveId } from '@/lib/novel-promotion/capsule-active-id'

describe('resolveCapsuleActiveId', () => {
  it('keeps voice as its own capsule id and maps assets onto script', () => {
    expect(resolveCapsuleActiveId('voice')).toBe('voice')
    expect(resolveCapsuleActiveId('assets')).toBe('script')
  })

  it('maps legacy story aliases onto config', () => {
    expect(resolveCapsuleActiveId('novel')).toBe('config')
    expect(resolveCapsuleActiveId('text')).toBe('config')
  })

  it('passes through known capsule ids', () => {
    expect(resolveCapsuleActiveId('config')).toBe('config')
    expect(resolveCapsuleActiveId('script')).toBe('script')
    expect(resolveCapsuleActiveId('storyboard')).toBe('storyboard')
    expect(resolveCapsuleActiveId('videos')).toBe('videos')
    expect(resolveCapsuleActiveId('voice')).toBe('voice')
    expect(resolveCapsuleActiveId('editor')).toBe('editor')
  })
})
