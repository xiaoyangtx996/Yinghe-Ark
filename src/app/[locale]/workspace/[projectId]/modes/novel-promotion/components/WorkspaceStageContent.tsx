'use client'

import ConfigStage from './ConfigStage'
import ScriptStage from './ScriptStage'
import StoryboardStage from './StoryboardStage'
import VideoStageRoute from './VideoStageRoute'
import VoiceStageRoute from './VoiceStageRoute'
import EditorGateStage from './EditorGateStage'

interface WorkspaceStageContentProps {
  currentStage: string
  onGoVideos?: () => void
}

export default function WorkspaceStageContent({
  currentStage,
  onGoVideos,
}: WorkspaceStageContentProps) {
  return (
    <div key={currentStage} className="animate-page-enter">
      {currentStage === 'config' && <ConfigStage />}

      {(currentStage === 'script' || currentStage === 'assets') && <ScriptStage />}

      {currentStage === 'storyboard' && <StoryboardStage />}

      {currentStage === 'videos' && <VideoStageRoute />}

      {currentStage === 'voice' && <VoiceStageRoute />}

      {currentStage === 'editor' && (
        <EditorGateStage onGoVideos={() => onGoVideos?.()} />
      )}
    </div>
  )
}
