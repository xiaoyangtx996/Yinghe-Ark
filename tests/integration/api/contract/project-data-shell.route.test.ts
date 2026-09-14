import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'

const authMock = vi.hoisted(() => ({
  requireProjectAuthLight: vi.fn(async (projectId: string) => ({
    session: { user: { id: 'user-1' } },
    project: {
      id: projectId,
      userId: 'user-1',
      name: 'Demo',
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      lastAccessedAt: new Date('2026-01-03T00:00:00.000Z'),
    },
  })),
  isErrorResponse: vi.fn((value: unknown) => value instanceof Response),
}))

const prismaMock = vi.hoisted(() => ({
  novelPromotionProject: {
    findUnique: vi.fn(async () => ({
      id: 'np-1',
      projectId: 'project-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      analysisModel: null,
      imageModel: null,
      videoModel: null,
      audioModel: null,
      videoRatio: '16:9',
      ttsRate: null,
      globalAssetText: null,
      artStyle: null,
      artStylePrompt: null,
      genrePack: null,
      characterModel: null,
      locationModel: null,
      storyboardModel: null,
      editModel: null,
      videoResolution: null,
      capabilityOverrides: null,
      workflowMode: null,
      lastEpisodeId: 'episode-1',
      imageResolution: null,
      importStatus: null,
      _count: {
        episodes: 12,
        characters: 3,
        locations: 2,
      },
    })),
  },
  project: {
    update: vi.fn(async () => ({ id: 'project-1' })),
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

describe('api contract - project data shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns config and counts without embedding episodes', async () => {
    const mod = await import('@/app/api/projects/[projectId]/data/route')
    const req = buildMockRequest({
      path: '/api/projects/project-1/data',
      method: 'GET',
    })

    const res = await mod.GET(req, { params: Promise.resolve({ projectId: 'project-1' }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.project.novelPromotionData.episodes).toEqual([])
    expect(body.project.novelPromotionData.episodeCount).toBe(12)
    expect(body.project.novelPromotionData.characterCount).toBe(3)
    expect(body.project.novelPromotionData.locationCount).toBe(2)
    expect(body.project.novelPromotionData.characters).toEqual([])
    expect(body.project.novelPromotionData.locations).toEqual([])
  })
})
