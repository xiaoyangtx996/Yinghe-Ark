'use client'

import ProgressToast from '@/components/ProgressToast'
import ConfirmDialog from '@/components/ConfirmDialog'
import TaskPipelineChecklist from '@/components/task/TaskPipelineChecklist'
import { AnimatedBackground } from '@/components/ui/SharedComponents'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { WorkspaceProvider } from './WorkspaceProvider'
import { WorkspaceEpisodeProvider } from './WorkspaceEpisodeContext'
import WorkspaceRunStreamConsoles from './components/WorkspaceRunStreamConsoles'
import WorkspaceStageContent from './components/WorkspaceStageContent'
import WorkspaceAssetLibraryModal from './components/WorkspaceAssetLibraryModal'
import WorkspaceHeaderShell from './components/WorkspaceHeaderShell'
import { WorkspaceStageRuntimeProvider } from './WorkspaceStageRuntimeContext'
import { useNovelPromotionWorkspaceController } from './hooks/useNovelPromotionWorkspaceController'
import type { NovelPromotionWorkspaceProps } from './types'
import { resolveEpisodeStageArtifacts } from '@/lib/novel-promotion/stage-readiness'
import {
  resolvePipelineChecklist,
  shouldShowPipelineChecklist,
} from '@/lib/task/pipeline-checklist'
import '@/styles/animations.css'

function NovelPromotionWorkspaceContent(props: NovelPromotionWorkspaceProps) {
  const vm = useNovelPromotionWorkspaceController(props)
  const tProgress = useTranslations('progress')

  const {
    projectId,
    episodeId,
    episode,
  } = props

  const storyToScriptStream = vm.execution.storyToScriptStream
  const scriptToStoryboardStream = vm.execution.scriptToStoryboardStream
  const storyToScriptActive =
    storyToScriptStream.isRunning ||
    storyToScriptStream.isRecoveredRunning ||
    storyToScriptStream.status === 'running'
  const scriptToStoryboardActive =
    scriptToStoryboardStream.isRunning ||
    scriptToStoryboardStream.isRecoveredRunning ||
    scriptToStoryboardStream.status === 'running'

  const pipelineItems = useMemo(
    () =>
      resolvePipelineChecklist({
        artifacts: resolveEpisodeStageArtifacts(episode),
        storyToScriptRunning: storyToScriptActive,
        scriptToStoryboardRunning: scriptToStoryboardActive,
        videoRunning: vm.execution.videoRunning,
        voiceRunning: vm.execution.voiceRunning,
      }),
    [
      episode,
      storyToScriptActive,
      scriptToStoryboardActive,
      vm.execution.videoRunning,
      vm.execution.voiceRunning,
    ],
  )

  const showPipelineChecklist = shouldShowPipelineChecklist({
    items: pipelineItems,
    storyToScriptRunning: storyToScriptActive,
    scriptToStoryboardRunning: scriptToStoryboardActive,
    showCreatingToast: vm.execution.showCreatingToast,
  })

  const showStoryToScriptMinBadge =
    storyToScriptStream.isVisible &&
    storyToScriptActive &&
    vm.execution.storyToScriptConsoleMinimized

  const showScriptToStoryboardMinBadge =
    scriptToStoryboardStream.isVisible &&
    scriptToStoryboardActive &&
    vm.execution.scriptToStoryboardConsoleMinimized

  const runBadges: { id: string; label: string; onClick: () => void }[] = []

  if (showStoryToScriptMinBadge) {
    runBadges.push({
      id: 'story-to-script',
      label: tProgress('runConsole.storyToScriptRunning'),
      onClick: () => vm.execution.setStoryToScriptConsoleMinimized(false),
    })
  }

  if (showScriptToStoryboardMinBadge) {
    runBadges.push({
      id: 'script-to-storyboard',
      label: tProgress('runConsole.scriptToStoryboardRunning'),
      onClick: () => vm.execution.setScriptToStoryboardConsoleMinimized(false),
    })
  }

  if (!vm.project.projectData) {
    return <div className="text-center text-(--glass-text-secondary)">{vm.i18n.tc('loading')}</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnimatedBackground />

      <WorkspaceHeaderShell
        isSettingsModalOpen={vm.ui.isSettingsModalOpen}
        isWorldContextModalOpen={vm.ui.isWorldContextModalOpen}
        onCloseSettingsModal={() => vm.ui.setIsSettingsModalOpen(false)}
        onCloseWorldContextModal={() => vm.ui.setIsWorldContextModalOpen(false)}
        availableModels={vm.ui.userModelsForSettings || undefined}
        modelsLoaded={vm.ui.userModelsLoaded}
        artStyle={vm.project.artStyle}
        analysisModel={vm.project.analysisModel}
        characterModel={vm.project.characterModel}
        locationModel={vm.project.locationModel}
        storyboardModel={vm.project.storyboardModel}
        editModel={vm.project.editModel}
        videoModel={vm.project.videoModel}
        audioModel={vm.project.audioModel}
        capabilityOverrides={vm.project.capabilityOverrides}
        videoRatio={vm.project.videoRatio}
        genrePack={vm.project.genrePack}
        ttsRate={vm.project.ttsRate !== undefined && vm.project.ttsRate !== null ? String(vm.project.ttsRate) : undefined}
        onUpdateConfig={vm.actions.handleUpdateConfig}
        globalAssetText={vm.project.globalAssetText}
        capsuleNavItems={vm.stageNav.capsuleNavItems}
        currentStage={vm.stageNav.currentStage}
        onStageChange={vm.stageNav.handleStageChange}
        projectId={projectId}
        episodeId={episodeId}
        onOpenAssetLibrary={() => vm.ui.openAssetLibrary()}
        onOpenSettingsModal={() => vm.ui.setIsSettingsModalOpen(true)}
        onRefresh={() => vm.ui.onRefresh({ mode: 'full' })}
        assetLibraryLabel={vm.i18n.t('buttons.assetLibrary')}
        settingsLabel={vm.i18n.t('buttons.settings')}
        refreshTitle={vm.i18n.t('buttons.refreshData')}
      >
        {showPipelineChecklist ? (
          <div className="shrink-0">
            <TaskPipelineChecklist
              items={pipelineItems}
              title={tProgress('pipelineChecklist.title')}
              subtitle={tProgress('pipelineChecklist.subtitle')}
              labels={{
                story: tProgress('pipelineChecklist.story'),
                script: tProgress('pipelineChecklist.script'),
                storyboard: tProgress('pipelineChecklist.storyboard'),
                video: tProgress('pipelineChecklist.video'),
                voice: tProgress('pipelineChecklist.voice'),
              }}
            />
          </div>
        ) : null}

        <WorkspaceStageRuntimeProvider value={vm.runtime.stageRuntime}>
          <WorkspaceStageContent
            currentStage={vm.stageNav.currentStage}
            onGoVideos={() => vm.stageNav.handleStageChange('videos')}
          />
        </WorkspaceStageRuntimeProvider>
      </WorkspaceHeaderShell>

      <WorkspaceAssetLibraryModal
        isOpen={vm.ui.isAssetLibraryOpen}
        onClose={vm.ui.closeAssetLibrary}
        assetsLoading={vm.ui.assetsLoading}
        assetsLoadingState={vm.ui.assetsLoadingState}
        hasCharacters={vm.project.characterCount > 0}
        hasLocations={vm.project.locationCount > 0}
        projectId={projectId}
        isAnalyzingAssets={vm.execution.isAssetAnalysisRunning}
        focusCharacterId={vm.ui.assetLibraryFocusCharacterId}
        focusCharacterRequestId={vm.ui.assetLibraryFocusRequestId}
        triggerGlobalAnalyze={vm.ui.triggerGlobalAnalyzeOnOpen}
        onGlobalAnalyzeComplete={() => vm.ui.setTriggerGlobalAnalyzeOnOpen(false)}
      />

      {vm.execution.showCreatingToast && (
        <ProgressToast
          show
          message={vm.i18n.t('storyInput.creating')}
          step={vm.execution.transitionProgress.step || ''}
          runBadges={runBadges}
        />
      )}

      <ConfirmDialog
        show={vm.rebuild.showRebuildConfirm}
        type="warning"
        title={vm.rebuild.rebuildConfirmTitle}
        message={vm.rebuild.rebuildConfirmMessage}
        confirmText={vm.i18n.t('rebuildConfirm.confirm')}
        cancelText={vm.i18n.t('rebuildConfirm.cancel')}
        onConfirm={vm.rebuild.handleAcceptRebuildConfirm}
        onCancel={vm.rebuild.handleCancelRebuildConfirm}
      />

      <WorkspaceRunStreamConsoles
        storyToScriptStream={vm.execution.storyToScriptStream}
        scriptToStoryboardStream={vm.execution.scriptToStoryboardStream}
        storyToScriptConsoleMinimized={vm.execution.storyToScriptConsoleMinimized}
        scriptToStoryboardConsoleMinimized={vm.execution.scriptToStoryboardConsoleMinimized}
        onStoryToScriptMinimizedChange={vm.execution.setStoryToScriptConsoleMinimized}
        onScriptToStoryboardMinimizedChange={vm.execution.setScriptToStoryboardConsoleMinimized}
        onContinueStoryToScript={() => { void vm.execution.continueAfterStoryToScript() }}
        onContinueScriptToStoryboard={() => { void vm.execution.continueAfterScriptToStoryboard() }}
        hideMinimizedBadges={vm.execution.showCreatingToast}
      />
    </div>
  )
}

export default function NovelPromotionWorkspace(props: NovelPromotionWorkspaceProps) {
  const { projectId, episodeId, episode } = props
  return (
    <WorkspaceProvider projectId={projectId} episodeId={episodeId}>
      <WorkspaceEpisodeProvider episode={episode} isPending={!episode}>
        <NovelPromotionWorkspaceContent {...props} />
      </WorkspaceEpisodeProvider>
    </WorkspaceProvider>
  )
}
