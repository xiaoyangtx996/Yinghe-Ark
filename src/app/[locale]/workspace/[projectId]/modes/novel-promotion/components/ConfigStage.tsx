'use client'

import { useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import NovelInputStage from './NovelInputStage'
import SmartImportWizard from './SmartImportWizard'
import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'
import { hasScriptArtifacts } from '@/lib/novel-promotion/stage-readiness'
import type { SplitEpisode } from './smart-import/types'

/**
 * 配置阶段 — 整合 NovelInputStage + 长文本智能分集
 *
 * 当用户输入长文本（>1000字）并点击"开始创作"时，
 * 弹出引导卡片建议使用智能分集。
 * 选择"智能分集"后，直接进入 SmartImportWizard 的分析流程。
 *
 * 若本集已有拆解结果，主按钮仅跳转到拆解页，不重新生成。
 */
export default function ConfigStage() {
  const runtime = useWorkspaceStageRuntime()
  const { episodeName, novelText, clips, isEpisodePending } = useWorkspaceEpisodeStageData()
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId ?? ''
  const hasExistingScript = !isEpisodePending && hasScriptArtifacts(clips)

  const [smartSplitMode, setSmartSplitMode] = useState(false)
  const [smartSplitText, setSmartSplitText] = useState('')

  const handleSmartSplit = useCallback((text: string) => {
    setSmartSplitText(text)
    setSmartSplitMode(true)
  }, [])

  const handleSmartSplitComplete = useCallback((episodes: SplitEpisode[]) => {
    void episodes
    window.location.reload()
  }, [])

  const handleNext = useCallback(() => {
    if (isEpisodePending) return
    if (hasExistingScript) {
      runtime.onStageChange('script')
      return
    }
    void runtime.onRunStoryToScript()
  }, [hasExistingScript, isEpisodePending, runtime])

  const handleRebuildScript = useCallback(() => {
    if (isEpisodePending) return
    void runtime.onRebuildStoryToScript(Array.isArray(clips) ? clips.length : 0)
  }, [clips, isEpisodePending, runtime])

  if (smartSplitMode) {
    return (
      <SmartImportWizard
        projectId={projectId}
        onManualCreate={() => setSmartSplitMode(false)}
        onImportComplete={handleSmartSplitComplete}
        initialRawContent={smartSplitText}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NovelInputStage
        novelText={novelText}
        episodeName={episodeName}
        onNovelTextChange={runtime.onNovelTextChange}
        isSubmittingTask={runtime.isSubmittingTTS || runtime.isStartingStoryToScript || isEpisodePending}
        isSwitchingStage={runtime.isTransitioning}
        hasExistingScript={hasExistingScript}
        videoRatio={runtime.videoRatio ?? undefined}
        artStyle={runtime.artStyle ?? undefined}
        genrePack={runtime.genrePack ?? undefined}
        onVideoRatioChange={runtime.onVideoRatioChange}
        onArtStyleChange={runtime.onArtStyleChange}
        onGenrePackChange={runtime.onGenrePackChange}
        onNext={handleNext}
        onRebuildScript={hasExistingScript ? handleRebuildScript : undefined}
        onSmartSplit={handleSmartSplit}
      />
    </div>
  )
}
