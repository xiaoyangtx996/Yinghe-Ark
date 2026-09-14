'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { replaceBrowserWorkspaceQuery } from '@/lib/workspace/workspace-url-query'

type RefreshOptions = { scope?: string; mode?: string }

interface SearchParamsLike {
  get: (name: string) => string | null
  toString: () => string
}

interface UseWorkspaceAssetLibraryShellParams {
  currentStage: string
  searchParams: SearchParamsLike | null
  /** @deprecated kept for call-site compat; query cleanup uses history.replaceState */
  router?: unknown
  onRefresh: (options?: RefreshOptions) => Promise<void>
}

/**
 * Asset library open/close + URL deep-links.
 * Stage assets are loaded by useProjectAssets subscribers — do not warm-refetch on every stage entry.
 */
export function useWorkspaceAssetLibraryShell({
  currentStage: _currentStage,
  searchParams,
  onRefresh,
}: UseWorkspaceAssetLibraryShellParams) {
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false)
  const [assetLibraryFocusCharacterId, setAssetLibraryFocusCharacterId] = useState<string | null>(null)
  const [assetLibraryFocusRequestId, setAssetLibraryFocusRequestId] = useState(0)
  const [triggerGlobalAnalyzeOnOpen, setTriggerGlobalAnalyzeOnOpen] = useState(false)
  const hasTriggeredGlobalAnalyze = useRef(false)

  const openAssetLibrary = useCallback((focusCharacterId?: string | null, refreshAssets = true) => {
    setAssetLibraryFocusCharacterId(focusCharacterId || null)
    setAssetLibraryFocusRequestId(prev => prev + 1)
    setIsAssetLibraryOpen(true)

    if (refreshAssets) {
      window.setTimeout(() => {
        onRefresh({ scope: 'assets' })
      }, 0)
    }
  }, [onRefresh])

  const closeAssetLibrary = useCallback(() => {
    setIsAssetLibraryOpen(false)
    setAssetLibraryFocusCharacterId(null)
  }, [])

  useEffect(() => {
    if (!searchParams) return

    const liveSearch =
      typeof window !== 'undefined' ? window.location.search : `?${searchParams.toString()}`
    const liveParams = new URLSearchParams(
      liveSearch.startsWith('?') ? liveSearch.slice(1) : liveSearch,
    )

    const shouldTriggerGlobalAnalyze = liveParams.get('globalAnalyze') === '1'
    const shouldOpenAssetLibrary = liveParams.get('assetLibrary') === '1'
    const focusCharacterId = liveParams.get('focusCharacter')

    if (!shouldTriggerGlobalAnalyze && !shouldOpenAssetLibrary) {
      return
    }

    if (shouldTriggerGlobalAnalyze) liveParams.delete('globalAnalyze')
    if (shouldOpenAssetLibrary) liveParams.delete('assetLibrary')
    if (focusCharacterId) liveParams.delete('focusCharacter')
    replaceBrowserWorkspaceQuery(liveParams)

    openAssetLibrary(focusCharacterId)

    if (shouldTriggerGlobalAnalyze && !hasTriggeredGlobalAnalyze.current) {
      hasTriggeredGlobalAnalyze.current = true
      setTriggerGlobalAnalyzeOnOpen(true)
    }
  }, [openAssetLibrary, searchParams])

  return {
    isAssetLibraryOpen,
    assetLibraryFocusCharacterId,
    assetLibraryFocusRequestId,
    triggerGlobalAnalyzeOnOpen,
    setTriggerGlobalAnalyzeOnOpen,
    openAssetLibrary,
    closeAssetLibrary,
  }
}
