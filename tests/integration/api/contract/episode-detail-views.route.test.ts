import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'

const authMock = vi.hoisted(() => ({
  requireProjectAuthLight: vi.fn(async (projectId: string) => ({
    session: { user: { id: 'user-1' } },
    project: { id: projectId, userId: 'user-1' },
  })),
  isErrorResponse: vi.fn((value: unknown) => value instanceof Response),
}))

const prismaMock = vi.hoisted(() => ({
  novelPromotionEpisode: {
    findUnique: vi.fn(),
  },
  novelPromotionProject: {
    update: vi.fn(async () => ({ id: 'np-1' })),
  },
}))

vi.mock('@/lib/api-auth', () => authMock)
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/logging/core', () => ({
  logError: vi.fn(),
  createScopedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))
vi.mock('@/lib/media/attach', () => ({
  attachMediaFieldsToProject: vi.fn(async (value: unknown) => value),
}))
vi.mock('@/lib/media/service', () => ({
  resolveMediaRefFromLegacyValue: vi.fn(),
}))

describe('api contract - episode detail views', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns lean panels payload without media signing', async () => {
    prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({
      id: 'episode-1',
      episodeNumber: 1,
      name: '第 1 集',
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      clips: [{ id: 'clip-1' }],
      storyboards: [
        {
          id: 'sb-1',
          clipId: 'clip-1',
          panels: [
            {
              id: 'panel-1',
              panelIndex: 0,
              description: 'establishing',
              srtSegment: null,
            },
          ],
        },
      ],
    })

    const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/[episodeId]/route')
    const req = buildMockRequest({
      path: '/api/novel-promotion/project-1/episodes/episode-1',
      method: 'GET',
      query: { view: 'panels' },
    })

    const res = await mod.GET(req, {
      params: Promise.resolve({ projectId: 'project-1', episodeId: 'episode-1' }),
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.episode.projectId).toBe('project-1')
    expect(body.episode.clips).toEqual([{ id: 'clip-1' }])
    expect(body.episode.voiceLines).toEqual([])
    expect(body.episode.storyboards[0].panels[0].id).toBe('panel-1')
    expect(prismaMock.novelPromotionEpisode.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'episode-1' },
        select: expect.objectContaining({
          clips: expect.any(Object),
          storyboards: expect.any(Object),
        }),
      }),
    )
  })
})
