'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../keys'
import { resolveTaskErrorMessage } from '@/lib/task/error-message'
import type { Project, MediaRef } from '@/types/project'
import { apiFetch } from '@/lib/api-fetch'
import {
  decodeEpisodeIndex,
  parseCompactEpisodeIndex,
  type CompactEpisodeIndex,
  type EpisodeIndexItem,
} from '@/lib/projects/episode-index'
import { getEpisodeQueryData } from '@/lib/query/episode-data-cache'

// ============ 项目数据 Hook ============

interface ProjectDataResponse {
    project: Project
}

/**
 * 获取项目壳层（配置 + 计数）。剧集索引见 fetchEpisodeIndex。
 */
export async function fetchProjectData(projectId: string): Promise<Project> {
    const dataRes = await apiFetch(`/api/projects/${projectId}/data`)
    if (!dataRes.ok) {
        const error = await dataRes.json().catch(() => ({}))
        throw new Error(resolveTaskErrorMessage(error, 'Failed to load project'))
    }
    const data: ProjectDataResponse = await dataRes.json()
    return data.project
}

export function useProjectData(projectId: string | null) {
    return useQuery({
        queryKey: queryKeys.projectData(projectId || ''),
        queryFn: async () => {
            if (!projectId) throw new Error('Project ID is required')
            return fetchProjectData(projectId)
        },
        enabled: !!projectId,
        // Structural project payload is large; rely on targeted invalidation after mutations.
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    })
}

/** Warm React Query cache before navigating into a project (card hover). */
export function prefetchProjectData(queryClient: QueryClient, projectId: string) {
    return queryClient.ensureQueryData({
        queryKey: queryKeys.projectData(projectId),
        queryFn: () => fetchProjectData(projectId),
        staleTime: 30_000,
    })
}
/**
 * 刷新项目数据
 */
export function useRefreshProjectData(projectId: string | null) {
    const queryClient = useQueryClient()

    return () => {
        if (projectId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.projectData(projectId) })
            queryClient.invalidateQueries({ queryKey: queryKeys.episodeIndex(projectId) })
        }
    }
}

// ============ 剧集索引 Hook ============

export async function fetchEpisodeIndex(projectId: string): Promise<CompactEpisodeIndex> {
    const res = await apiFetch(`/api/novel-promotion/${projectId}/episodes?view=index`)
    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(resolveTaskErrorMessage(error, 'Failed to load episode index'))
    }
    const payload = await res.json().catch(() => null) as { episodes?: unknown } | null
    const compact = parseCompactEpisodeIndex(payload?.episodes)
    if (compact) return compact
    // Legacy object-array payloads → normalize to v2 via encode path in decode+re-encode.
    const items = decodeEpisodeIndex(payload?.episodes)
    const { encodeEpisodeIndex } = await import('@/lib/projects/episode-index')
    return encodeEpisodeIndex(items)
}

export function useEpisodeIndex(
    projectId: string | null,
    options?: { enabled?: boolean },
) {
    const enabled = options?.enabled ?? true
    return useQuery({
        queryKey: queryKeys.episodeIndex(projectId || ''),
        queryFn: async () => {
            if (!projectId) throw new Error('Project ID is required')
            return fetchEpisodeIndex(projectId)
        },
        enabled: !!projectId && enabled,
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    })
}

export function prefetchEpisodeIndex(queryClient: QueryClient, projectId: string) {
    return queryClient.ensureQueryData({
        queryKey: queryKeys.episodeIndex(projectId),
        queryFn: () => fetchEpisodeIndex(projectId),
        staleTime: 30_000,
    })
}

// ============ 剧集数据 Hook ============

export interface Episode {
    id: string
    episodeNumber: number
    name: string
    description?: string | null
    novelText?: string | null
    audioUrl?: string | null
    media?: MediaRef | null
    srtContent?: string | null
    createdAt: string
    clips?: Array<{ screenplay?: string | null; [key: string]: unknown }>
    storyboards?: Array<{ panels?: unknown[] | null; [key: string]: unknown }>
    // 剧集详情数据
    voiceLines?: VoiceLine[]
    storyboardData?: StoryboardData
}

interface VoiceLine {
    id: string
    text: string
    speakerId: string
    audioUrl?: string | null
    media?: MediaRef | null
    lineTaskRunning?: boolean
}

interface StoryboardData {
    panels: unknown[]
}

/**
 * 获取剧集详情
 * @param view full=签名分镜；script=仅 clips；panels=精简绑镜索引
 */
export async function fetchEpisodeData(
    projectId: string,
    episodeId: string,
    view: 'full' | 'script' | 'panels' = 'full',
): Promise<Episode> {
    const search = new URLSearchParams({ view })
    const res = await apiFetch(
        `/api/novel-promotion/${projectId}/episodes/${episodeId}?${search.toString()}`,
    )
    if (!res.ok) {
        const error = await res.json()
        throw new Error(resolveTaskErrorMessage(error, 'Failed to load episode'))
    }
    const data = await res.json()
    return data.episode as Episode
}

export function useEpisodeData(
    projectId: string | null,
    episodeId: string | null,
    view: 'full' | 'script' | 'panels' = 'full',
) {
    const queryClient = useQueryClient()
    return useQuery({
        queryKey: queryKeys.episodeData(projectId || '', episodeId || '', view),
        queryFn: async () => {
            if (!projectId || !episodeId) throw new Error('Project ID and Episode ID are required')
            return fetchEpisodeData(projectId, episodeId, view)
        },
        enabled: !!projectId && !!episodeId,
        staleTime: 30_000,
        // Stage switches change the view key (new fetch). Same-key remount/focus must not storm.
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        // Keep prior (possibly other-view) episode so workspace does not unmount mid-switch.
        placeholderData: () => {
            if (!projectId || !episodeId) return undefined
            return getEpisodeQueryData<Episode>(queryClient, projectId, episodeId, view)
        },
    })
}

/**
 * 获取项目的剧集列表（资产筛选等短路径；全量 decode）
 */
export function useEpisodes(projectId: string | null) {
    const { data: project } = useProjectData(projectId)
    const { data: compact, isPending } = useEpisodeIndex(projectId)

    const episodes = useMemo(
        () => (compact ? decodeEpisodeIndex(compact) : []),
        [compact],
    )
    return { episodes, isLoading: !project || isPending }
}

/**
 * 刷新剧集数据
 */
export function useRefreshEpisodeData(projectId: string | null, episodeId: string | null) {
    const queryClient = useQueryClient()

    return () => {
        if (projectId && episodeId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.episodeData(projectId, episodeId)
            })
        }
    }
}

/**
 * 刷新所有相关数据（项目 + 当前剧集）
 */
export function useRefreshAll(projectId: string | null, episodeId: string | null) {
    const queryClient = useQueryClient()

    return () => {
        if (projectId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.projectData(projectId) })
            queryClient.invalidateQueries({ queryKey: queryKeys.episodeIndex(projectId) })
            queryClient.invalidateQueries({ queryKey: queryKeys.projectAssets.all(projectId) })
        }
        if (projectId && episodeId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.episodeData(projectId, episodeId)
            })
            queryClient.invalidateQueries({
                queryKey: queryKeys.storyboards.all(episodeId)
            })
        }
    }
}
