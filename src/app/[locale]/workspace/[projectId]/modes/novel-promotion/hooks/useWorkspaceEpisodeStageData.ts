'use client'

import { useWorkspaceEpisodeContext } from '../WorkspaceEpisodeContext'

/**
 * Stage-facing episode fields. Backed by the single page-level useEpisodeData subscription
 * (via WorkspaceEpisodeProvider) — do not add another episode GET here.
 */
export function useWorkspaceEpisodeStageData() {
  const {
    episodeName,
    novelText,
    clips,
    storyboards,
    isEpisodePending,
  } = useWorkspaceEpisodeContext()

  return {
    episodeName,
    novelText,
    clips,
    storyboards,
    isEpisodePending,
  }
}
