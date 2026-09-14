'use client'

import { logError as _ulogError } from '@/lib/logging/core'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetProjectStoryboardStats,
  useUpdateProjectConfig,
  useUpdateProjectEpisodeField,
} from '@/lib/query/hooks'
import { getEpisodeQueryData } from '@/lib/query/episode-data-cache'
import type { Episode } from '@/lib/query/hooks/useProjectData'

function countStoryboardStats(storyboards: Array<{ panels?: unknown[] | null }> | undefined) {
  const list = Array.isArray(storyboards) ? storyboards : []
  return {
    storyboardCount: list.length,
    panelCount: list.reduce((sum, storyboard) => {
      const panels = Array.isArray(storyboard?.panels) ? storyboard.panels.length : 0
      return sum + panels
    }, 0),
  }
}

interface UseWorkspaceConfigActionsParams {
  projectId: string
  episodeId?: string
  onStageChange?: (stage: string) => void
}

export function useWorkspaceConfigActions({
  projectId,
  episodeId,
  onStageChange,
}: UseWorkspaceConfigActionsParams) {
  const queryClient = useQueryClient()
  const updateProjectConfigMutation = useUpdateProjectConfig(projectId)
  const updateProjectEpisodeMutation = useUpdateProjectEpisodeField(projectId)
  const getProjectStoryboardStatsMutation = useGetProjectStoryboardStats(projectId)

  const handleStageChange = useCallback((stage: string) => {
    onStageChange?.(stage)
  }, [onStageChange])

  const handleUpdateConfig = useCallback(async (key: string, value: unknown) => {
    try {
      await updateProjectConfigMutation.mutateAsync({ key, value })
    } catch (error: unknown) {
      _ulogError('Update config error:', error)
    }
  }, [updateProjectConfigMutation])

  const handleUpdateEpisode = useCallback(async (key: string, value: unknown) => {
    if (!episodeId) {
      _ulogError('No episode selected')
      return
    }

    try {
      await updateProjectEpisodeMutation.mutateAsync({ episodeId, key, value })
    } catch (error: unknown) {
      _ulogError('Update episode error:', error)
    }
  }, [episodeId, updateProjectEpisodeMutation])

  const getProjectStoryboardStats = useCallback(async (targetEpisodeId: string) => {
    const cached = getEpisodeQueryData<Episode>(queryClient, projectId, targetEpisodeId, 'full')
    // Only trust positive cache hits; empty arrays may be stale and must revalidate.
    if (Array.isArray(cached?.storyboards) && cached.storyboards.length > 0) {
      return countStoryboardStats(cached.storyboards)
    }
    return getProjectStoryboardStatsMutation.mutateAsync({ episodeId: targetEpisodeId })
  }, [getProjectStoryboardStatsMutation, projectId, queryClient])

  return {
    handleStageChange,
    handleUpdateConfig,
    handleUpdateEpisode,
    getProjectStoryboardStats,
  }
}
