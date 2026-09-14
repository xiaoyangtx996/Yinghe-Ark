'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { NovelPromotionClip, NovelPromotionStoryboard } from '@/types/project'
import type { Episode } from './types'

type WorkspaceEpisodeContextValue = {
  episode: Episode | null | undefined
  episodeName?: string
  novelText: string
  clips: NovelPromotionClip[]
  storyboards: NovelPromotionStoryboard[]
  isEpisodePending: boolean
}

const WorkspaceEpisodeContext = createContext<WorkspaceEpisodeContextValue | null>(null)

export function WorkspaceEpisodeProvider({
  episode,
  isPending = false,
  children,
}: {
  episode?: Episode | null
  isPending?: boolean
  children: ReactNode
}) {
  const value: WorkspaceEpisodeContextValue = {
    episode,
    episodeName: episode?.name,
    novelText: episode?.novelText || '',
    clips: Array.isArray(episode?.clips) ? episode.clips : [],
    storyboards: Array.isArray(episode?.storyboards) ? episode.storyboards : [],
    isEpisodePending: isPending,
  }

  return (
    <WorkspaceEpisodeContext.Provider value={value}>
      {children}
    </WorkspaceEpisodeContext.Provider>
  )
}

export function useWorkspaceEpisodeContext() {
  const context = useContext(WorkspaceEpisodeContext)
  if (!context) {
    throw new Error('useWorkspaceEpisodeContext must be used within WorkspaceEpisodeProvider')
  }
  return context
}
