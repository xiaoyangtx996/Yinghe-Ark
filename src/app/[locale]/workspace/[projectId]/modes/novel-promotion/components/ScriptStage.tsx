'use client'

import ScriptView from './ScriptView'
import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'
import { useWorkspaceProvider } from '../WorkspaceProvider'

export default function ScriptStage() {
  const runtime = useWorkspaceStageRuntime()
  const { projectId, episodeId } = useWorkspaceProvider()
  const { clips, storyboards } = useWorkspaceEpisodeStageData()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScriptView
        projectId={projectId}
        episodeId={episodeId}
        clips={clips}
        storyboards={storyboards}
        assetsLoading={runtime.assetsLoading}
        onClipUpdate={runtime.onClipUpdate}
        onOpenAssetLibrary={runtime.onOpenAssetLibrary}
        onGenerateStoryboard={runtime.onRunScriptToStoryboard}
        isSubmittingStoryboardBuild={runtime.isConfirmingAssets || runtime.isStartingScriptToStoryboard}
      />
    </div>
  )
}
