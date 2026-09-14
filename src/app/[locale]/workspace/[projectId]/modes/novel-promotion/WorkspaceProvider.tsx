'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { useSSE } from '@/lib/query/hooks/useSSE'
import type { SSEEvent } from '@/lib/task/types'

type RefreshScope = 'all' | 'assets' | 'project'
type RefreshOptions = { scope?: string; mode?: string }
type TaskEventListener = (event: SSEEvent) => void

interface WorkspaceContextValue {
  projectId: string
  episodeId?: string
  refreshData: (scope?: RefreshScope) => Promise<void>
  onRefresh: (options?: RefreshOptions) => Promise<void>
  subscribeTaskEvents: (listener: TaskEventListener) => () => void
}

interface WorkspaceProviderProps {
  projectId: string
  episodeId?: string
  children: ReactNode
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ projectId, episodeId, children }: WorkspaceProviderProps) {
  const queryClient = useQueryClient()
  const listenersRef = useRef(new Set<TaskEventListener>())
  const [sseEnabled, setSseEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    const enable = () => {
      if (!cancelled) setSseEnabled(true)
    }
    // Prefer idle so shell APIs / first paint win; fall back to a short timeout.
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(enable, { timeout: 1200 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }
    const timer = window.setTimeout(enable, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [projectId])

  const refreshData = useCallback(async (scope?: RefreshScope) => {
    const promises: Promise<unknown>[] = []

    // scope=assets → 只刷资产；勿连带 episode（stage 挂载暖启动会走这条路径）
    if (!scope || scope === 'all' || scope === 'project') {
      promises.push(queryClient.refetchQueries({ queryKey: queryKeys.projectData(projectId) }))
      promises.push(queryClient.refetchQueries({ queryKey: queryKeys.episodeIndex(projectId) }))
    }

    if (!scope || scope === 'all' || scope === 'assets') {
      promises.push(queryClient.refetchQueries({ queryKey: queryKeys.projectAssets.all(projectId) }))
    }

    if (episodeId && (!scope || scope === 'all' || scope === 'project')) {
      promises.push(queryClient.refetchQueries({ queryKey: queryKeys.episodeData(projectId, episodeId) }))
      promises.push(queryClient.refetchQueries({ queryKey: queryKeys.storyboards.all(episodeId) }))
      promises.push(queryClient.refetchQueries({ queryKey: queryKeys.voiceLines.all(episodeId) }))
    }

    await Promise.all(promises)
  }, [episodeId, projectId, queryClient])

  const onRefresh = useCallback(async (options?: RefreshOptions) => {
    await refreshData(options?.scope as RefreshScope | undefined)
  }, [refreshData])

  const subscribeTaskEvents = useCallback((listener: TaskEventListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const handleTaskEvent = useCallback((event: SSEEvent) => {
    for (const listener of listenersRef.current) {
      listener(event)
    }
  }, [])

  useSSE({
    projectId,
    episodeId,
    // Defer EventSource until after first paint so cold workspace entry isn't competing with shell APIs.
    enabled: !!projectId && sseEnabled,
    onEvent: handleTaskEvent,
  })

  const value = useMemo<WorkspaceContextValue>(() => ({
    projectId,
    episodeId,
    refreshData,
    onRefresh,
    subscribeTaskEvents,
  }), [episodeId, onRefresh, projectId, refreshData, subscribeTaskEvents])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspaceProvider() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspaceProvider must be used within WorkspaceProvider')
  }
  return context
}
