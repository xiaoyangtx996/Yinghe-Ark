import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api-errors'
import {
  assertEpisodeOwnedByProject,
  assertResourceOwnedViaEpisode,
  isEpisodeOwnedByProject,
  isResourceOwnedViaEpisode,
} from '@/lib/novel-promotion/resource-ownership'

describe('isEpisodeOwnedByProject', () => {
  it('returns true when nested projectId matches', () => {
    expect(
      isEpisodeOwnedByProject(
        { novelPromotionProject: { projectId: 'proj-a' } },
        'proj-a',
      ),
    ).toBe(true)
  })

  it('returns false for mismatch, null, or undefined', () => {
    expect(
      isEpisodeOwnedByProject(
        { novelPromotionProject: { projectId: 'proj-b' } },
        'proj-a',
      ),
    ).toBe(false)
    expect(isEpisodeOwnedByProject(null, 'proj-a')).toBe(false)
    expect(isEpisodeOwnedByProject(undefined, 'proj-a')).toBe(false)
  })
})

describe('isResourceOwnedViaEpisode', () => {
  it('delegates to episode ownership', () => {
    expect(
      isResourceOwnedViaEpisode(
        { episode: { novelPromotionProject: { projectId: 'proj-a' } } },
        'proj-a',
      ),
    ).toBe(true)
    expect(
      isResourceOwnedViaEpisode(
        { episode: { novelPromotionProject: { projectId: 'proj-b' } } },
        'proj-a',
      ),
    ).toBe(false)
  })
})

describe('assert* ownership', () => {
  it('throws ApiError NOT_FOUND when episode is foreign', () => {
    expect(() =>
      assertEpisodeOwnedByProject(
        { novelPromotionProject: { projectId: 'other' } },
        'mine',
      ),
    ).toThrow(ApiError)

    try {
      assertEpisodeOwnedByProject(null, 'mine')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).code).toBe('NOT_FOUND')
    }
  })

  it('throws ApiError NOT_FOUND when storyboard/clip via episode is foreign', () => {
    expect(() =>
      assertResourceOwnedViaEpisode(
        { episode: { novelPromotionProject: { projectId: 'other' } } },
        'mine',
      ),
    ).toThrow(ApiError)
  })

  it('does not throw when ownership matches', () => {
    expect(() =>
      assertEpisodeOwnedByProject(
        { novelPromotionProject: { projectId: 'mine' } },
        'mine',
      ),
    ).not.toThrow()
    expect(() =>
      assertResourceOwnedViaEpisode(
        { episode: { novelPromotionProject: { projectId: 'mine' } } },
        'mine',
      ),
    ).not.toThrow()
  })
})
