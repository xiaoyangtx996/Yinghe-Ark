'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { logWarn as _ulogWarn } from '@/lib/logging/core'

type RebuildActionType = 'storyToScript' | 'scriptToStoryboard'
type StoryToScriptConfirmKind = 'script' | 'storyboard'

interface RebuildConfirmContext {
  actionType: RebuildActionType
  storyboardCount: number
  panelCount: number
  clipCount: number
  storyToScriptKind: StoryToScriptConfirmKind | null
}

interface DownstreamCheckResult {
  shouldConfirm: boolean
  storyboardCount: number
  panelCount: number
}

type StoryboardStats = {
  storyboardCount: number
  panelCount: number
}

export function hasDownstreamStoryboardData(stats: StoryboardStats): boolean {
  return stats.storyboardCount > 0 || stats.panelCount > 0
}

interface StoryboardLike {
  panels?: unknown[] | null
}

interface UseRebuildConfirmParams {
  episodeId?: string
  episodeStoryboards?: StoryboardLike[]
  /** Existing breakdown clips; story→script rebuild should confirm when > 0. */
  existingClipCount?: number
  getProjectStoryboardStats: (episodeId: string) => Promise<StoryboardStats>
  t: (key: string, values?: Record<string, string | number | Date>) => string
}

export function useRebuildConfirm({
  episodeId,
  episodeStoryboards,
  existingClipCount = 0,
  getProjectStoryboardStats,
  t,
}: UseRebuildConfirmParams) {
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false)
  const [rebuildConfirmContext, setRebuildConfirmContext] = useState<RebuildConfirmContext | null>(null)
  const [pendingActionType, setPendingActionType] = useState<RebuildActionType | null>(null)
  const pendingRebuildActionRef = useRef<(() => Promise<void>) | null>(null)
  const safeClipCount = Math.max(0, Math.floor(existingClipCount || 0))

  const getFallbackStoryboardStats = useCallback(() => {
    const storyboards = Array.isArray(episodeStoryboards) ? episodeStoryboards : []
    const storyboardCount = storyboards.length
    const panelCount = storyboards.reduce((sum: number, storyboard) => {
      const panels = Array.isArray(storyboard?.panels) ? storyboard.panels.length : 0
      return sum + panels
    }, 0)
    return { storyboardCount, panelCount }
  }, [episodeStoryboards])

  const checkStoryboardDownstreamData = useCallback(async (): Promise<DownstreamCheckResult> => {
    if (!episodeId) {
      return { shouldConfirm: false, storyboardCount: 0, panelCount: 0 }
    }

    try {
      const { storyboardCount, panelCount } = await getProjectStoryboardStats(episodeId)
      return {
        shouldConfirm: hasDownstreamStoryboardData({ storyboardCount, panelCount }),
        storyboardCount,
        panelCount,
      }
    } catch (error) {
      _ulogWarn('[RebuildConfirm] Failed to check downstream storyboards, fallback to local cache', error)
      const fallbackStats = getFallbackStoryboardStats()
      return {
        shouldConfirm: hasDownstreamStoryboardData(fallbackStats),
        storyboardCount: fallbackStats.storyboardCount,
        panelCount: fallbackStats.panelCount,
      }
    }
  }, [episodeId, getFallbackStoryboardStats, getProjectStoryboardStats])

  const runWithRebuildConfirm = useCallback(async (
    actionType: RebuildActionType,
    action: () => Promise<void>,
    options?: { forceConfirm?: boolean; clipCount?: number },
  ) => {
    if (pendingActionType === actionType) return

    setPendingActionType(actionType)
    try {
      const clipCount = Math.max(
        0,
        Math.floor(
          typeof options?.clipCount === 'number' ? options.clipCount : safeClipCount,
        ),
      )
      const needsScriptConfirm = actionType === 'storyToScript'
        && (Boolean(options?.forceConfirm) || clipCount > 0)

      // forceConfirm / local clip gate: skip storyboard network round-trip for snappy confirm UI
      const downstream = options?.forceConfirm
        ? (() => {
          const fallback = getFallbackStoryboardStats()
          return {
            shouldConfirm: hasDownstreamStoryboardData(fallback),
            storyboardCount: fallback.storyboardCount,
            panelCount: fallback.panelCount,
          }
        })()
        : await checkStoryboardDownstreamData()

      const shouldConfirm = downstream.shouldConfirm || needsScriptConfirm

      if (!shouldConfirm) {
        try {
          await action()
        } finally {
          setPendingActionType((current) => (current === actionType ? null : current))
        }
        return
      }

      pendingRebuildActionRef.current = async () => {
        try {
          await action()
        } finally {
          setPendingActionType((current) => (current === actionType ? null : current))
        }
      }
      setRebuildConfirmContext({
        actionType,
        storyboardCount: downstream.storyboardCount,
        panelCount: downstream.panelCount,
        clipCount: options?.forceConfirm ? Math.max(clipCount, 1) : clipCount,
        storyToScriptKind: actionType === 'storyToScript'
          ? (downstream.shouldConfirm ? 'storyboard' : 'script')
          : null,
      })
      setShowRebuildConfirm(true)
    } catch (error) {
      setPendingActionType((current) => (current === actionType ? null : current))
      throw error
    }
  }, [checkStoryboardDownstreamData, getFallbackStoryboardStats, pendingActionType, safeClipCount])

  const handleCancelRebuildConfirm = useCallback(() => {
    const currentActionType = rebuildConfirmContext?.actionType ?? pendingActionType
    pendingRebuildActionRef.current = null
    setShowRebuildConfirm(false)
    setRebuildConfirmContext(null)
    if (currentActionType) {
      setPendingActionType((current) => (current === currentActionType ? null : current))
    }
  }, [pendingActionType, rebuildConfirmContext])

  const handleAcceptRebuildConfirm = useCallback(() => {
    const pendingAction = pendingRebuildActionRef.current
    pendingRebuildActionRef.current = null
    setShowRebuildConfirm(false)
    setRebuildConfirmContext(null)
    if (pendingAction) {
      void pendingAction()
      return
    }
    setPendingActionType(null)
  }, [])

  const rebuildConfirmTitle = useMemo(() => {
    if (!rebuildConfirmContext) return ''
    if (rebuildConfirmContext.actionType === 'storyToScript') {
      if (rebuildConfirmContext.storyToScriptKind === 'script') {
        return t('rebuildConfirm.storyToScript.scriptOnlyTitle')
      }
      return t('rebuildConfirm.storyToScript.title')
    }
    return t('rebuildConfirm.scriptToStoryboard.title')
  }, [rebuildConfirmContext, t])

  const rebuildConfirmMessage = useMemo(() => {
    if (!rebuildConfirmContext) return ''
    const values = {
      storyboardCount: rebuildConfirmContext.storyboardCount,
      panelCount: rebuildConfirmContext.panelCount,
      clipCount: rebuildConfirmContext.clipCount,
    }
    if (rebuildConfirmContext.actionType === 'storyToScript') {
      if (rebuildConfirmContext.storyToScriptKind === 'script') {
        return t('rebuildConfirm.storyToScript.scriptOnlyMessage', values)
      }
      return t('rebuildConfirm.storyToScript.message', values)
    }
    return t('rebuildConfirm.scriptToStoryboard.message', values)
  }, [rebuildConfirmContext, t])

  return {
    showRebuildConfirm,
    rebuildConfirmTitle,
    rebuildConfirmMessage,
    pendingActionType,
    runWithRebuildConfirm,
    handleCancelRebuildConfirm,
    handleAcceptRebuildConfirm,
  }
}
