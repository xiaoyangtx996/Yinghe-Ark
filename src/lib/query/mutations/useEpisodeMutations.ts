import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@/types/project'
import { resolveTaskResponse } from '@/lib/task/client'
import { queryKeys } from '../keys'
import {
  restoreEpisodeSnapshots,
  setEpisodeQueryData,
  snapshotEpisodeQueries,
} from '../episode-data-cache'
import {
  invalidateQueryTemplates,
  requestBlobWithError,
  requestJsonWithError,
  requestTaskResponseWithError,
} from './mutation-shared'
import {
  parseCompactEpisodeIndex,
  renameCompactEpisode,
  type CompactEpisodeIndex,
} from '@/lib/projects/episode-index'

/**
 * 获取项目剧集列表（智能导入恢复：含 novelText）
 */
export function useListProjectEpisodes(projectId: string) {
  return useMutation({
    mutationFn: async () =>
      await requestJsonWithError<{
        episodes?: Array<{
          episodeNumber?: number
          name?: string
          description?: string
          novelText?: string
        }>
      }>(`/api/novel-promotion/${projectId}/episodes?view=text`, { method: 'GET' }, '获取剧集失败'),
  })
}

/**
 * AI 智能分割剧集
 */
export function useSplitProjectEpisodes(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { content: string; async?: boolean }) => {
      const response = await requestTaskResponseWithError(
        `/api/novel-promotion/${projectId}/episodes/split`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '分割失败',
      )
      return resolveTaskResponse<{
        episodes: Array<{
          number: number
          title: string
          summary: string
          content: string
          wordCount: number
        }>
      }>(response)
    },
  })
}

/**
 * 使用章节标记分割剧集
 */
export function useSplitProjectEpisodesByMarkers(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { content: string }) =>
      await requestJsonWithError<{
        episodes?: Array<{
          number: number
          title: string
          summary: string
          content: string
          wordCount: number
        }>
      }>(
        `/api/novel-promotion/${projectId}/episodes/split-by-markers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '分割失败',
      ),
  })
}

/**
 * 批量保存项目剧集
 */
export function useSaveProjectEpisodesBatch(projectId: string) {
  return useMutation({
    mutationFn: async (payload: {
      episodes: Array<{
        name: string
        description?: string
        novelText?: string
      }>
      clearExisting?: boolean
      importStatus?: 'pending' | 'completed'
      triggerGlobalAnalysis?: boolean
    }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/episodes/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '保存剧集失败',
      ),
  })
}

/**
 * 更新剧集字段
 */
export function useUpdateProjectEpisodeField(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      episodeId,
      key,
      value,
    }: {
      episodeId: string
      key: string
      value: unknown
    }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/episodes/${episodeId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        },
        'Failed to update episode',
      ),
    onMutate: async (variables) => {
      const episodeQueryKey = queryKeys.episodeData(projectId, variables.episodeId)
      const projectQueryKey = queryKeys.projectData(projectId)
      const indexQueryKey = queryKeys.episodeIndex(projectId)

      await queryClient.cancelQueries({ queryKey: episodeQueryKey })
      await queryClient.cancelQueries({ queryKey: projectQueryKey })
      await queryClient.cancelQueries({ queryKey: indexQueryKey })

      const previousEpisodeSnapshots = snapshotEpisodeQueries(
        queryClient,
        projectId,
        variables.episodeId,
      )
      const previousProject = queryClient.getQueryData<Project>(projectQueryKey)
      const previousIndex = queryClient.getQueryData(indexQueryKey)

      setEpisodeQueryData(queryClient, projectId, variables.episodeId, (prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...(prev as Record<string, unknown>),
          [variables.key]: variables.value,
        }
      })

      if (variables.key === 'name' && typeof variables.value === 'string') {
        const nextName = variables.value
        queryClient.setQueryData<CompactEpisodeIndex | undefined>(indexQueryKey, (prev) => {
          if (!prev) return prev
          const compact = parseCompactEpisodeIndex(prev) || prev
          return renameCompactEpisode(compact, variables.episodeId, nextName)
        })
      }

      return {
        previousEpisodeSnapshots,
        previousProject,
        previousIndex,
        episodeId: variables.episodeId,
      }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpisodeSnapshots) {
        restoreEpisodeSnapshots(queryClient, context.previousEpisodeSnapshots)
      }
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projectData(projectId), context.previousProject)
      }
      if (context?.previousIndex !== undefined) {
        queryClient.setQueryData(queryKeys.episodeIndex(projectId), context.previousIndex)
      }
    },
    onSettled: (_, __, variables) => {
      invalidateQueryTemplates(queryClient, [
        queryKeys.episodeData(projectId, variables.episodeId),
        queryKeys.projectData(projectId),
        queryKeys.episodeIndex(projectId),
      ])
    },
  })
}

/**
 * 更新 clip 数据
 */
export function useUpdateProjectClip(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clipId,
      data,
    }: {
      clipId: string
      data: Record<string, unknown>
      episodeId?: string
    }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/clips/${clipId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'update failed',
      ),
    onMutate: async (variables) => {
      if (!variables.episodeId) return { previousEpisodeSnapshots: null, episodeId: null }

      const episodeQueryKey = queryKeys.episodeData(projectId, variables.episodeId)
      await queryClient.cancelQueries({ queryKey: episodeQueryKey })

      const previousEpisodeSnapshots = snapshotEpisodeQueries(
        queryClient,
        projectId,
        variables.episodeId,
      )
      setEpisodeQueryData(queryClient, projectId, variables.episodeId, (prev) => {
        if (!prev || typeof prev !== 'object') return prev
        const episode = prev as Record<string, unknown>
        const clips = Array.isArray(episode.clips) ? episode.clips : []
        return {
          ...episode,
          clips: clips.map((clip: Record<string, unknown>) =>
            clip?.id === variables.clipId ? { ...clip, ...variables.data } : clip,
          ),
        }
      })

      return { previousEpisodeSnapshots, episodeId: variables.episodeId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpisodeSnapshots) {
        restoreEpisodeSnapshots(queryClient, context.previousEpisodeSnapshots)
      }
    },
    onSettled: (_data, _error, variables) => {
      const queryTemplates: Array<readonly unknown[]> = [queryKeys.projectData(projectId)]
      if (variables.episodeId) queryTemplates.push(queryKeys.episodeData(projectId, variables.episodeId))
      invalidateQueryTemplates(queryClient, queryTemplates)
    },
  })
}

/**
 * Merge selected clip with the next clip
 */
export function useMergeProjectClips(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { episodeId: string; keepClipId: string }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/clips/merge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'merge clips failed',
      ),
    onSettled: (_data, _error, variables) => {
      invalidateQueryTemplates(queryClient, [
        queryKeys.episodeData(projectId, variables.episodeId),
        queryKeys.projectData(projectId),
        queryKeys.projectAssets.all(projectId),
      ])
    },
  })
}

/**
 * Sync LLM script review (findings only — does not mutate clips)
 */
export function useScriptLlmReview(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { episodeId: string }) =>
      await requestJsonWithError<{
        success?: boolean
        findings?: Array<{
          gateId: string | null
          severity: 'info' | 'warn'
          title: string
          detail: string
          clipIds: string[]
        }>
      }>(
        `/api/novel-promotion/${projectId}/script-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'script review failed',
      ),
  })
}

/**
 * Sync LLM storyboard review (findings only — does not mutate panels)
 */
export function useStoryboardLlmReview(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { episodeId: string }) =>
      await requestJsonWithError<{
        success?: boolean
        findings?: Array<{
          gateId: string | null
          severity: 'info' | 'warn'
          title: string
          detail: string
          panelIds: string[]
        }>
      }>(
        `/api/novel-promotion/${projectId}/storyboard-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'storyboard review failed',
      ),
  })
}

/**
 * Sync LLM video review (findings only — does not mutate panels)
 */
export function useVideoLlmReview(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { episodeId: string }) =>
      await requestJsonWithError<{
        success?: boolean
        findings?: Array<{
          gateId: string | null
          severity: 'info' | 'warn'
          title: string
          detail: string
          panelIds: string[]
        }>
      }>(
        `/api/novel-promotion/${projectId}/video-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'video review failed',
      ),
  })
}

/**
 * 下载远程文件 blob（避免组件层直接 fetch）
 */
export function useDownloadRemoteBlob() {
  return useMutation({
    mutationFn: async (url: string) =>
      await requestBlobWithError(
        url,
        { method: 'GET' },
        '下载失败',
      ),
  })
}
