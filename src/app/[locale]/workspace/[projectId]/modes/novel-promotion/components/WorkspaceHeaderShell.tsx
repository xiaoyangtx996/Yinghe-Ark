'use client'

import type { ReactNode } from 'react'
import { SettingsModal, WorldContextModal } from '@/components/ui/ConfigModals'
import WorkspaceTopActions from './WorkspaceTopActions'
import WorkspaceStageSwitcher from './WorkspaceStageSwitcher'
import type { CapabilitySelections, ModelCapabilities } from '@/lib/model-config-contract'
import { resolveCapsuleActiveId } from '@/lib/novel-promotion/capsule-active-id'

interface UserModelOption {
  value: string
  label: string
  provider?: string
  providerName?: string
  capabilities?: ModelCapabilities
}

interface UserModelsPayload {
  llm: UserModelOption[]
  image: UserModelOption[]
  video: UserModelOption[]
  audio: UserModelOption[]
}

interface WorkspaceHeaderShellProps {
  isSettingsModalOpen: boolean
  isWorldContextModalOpen: boolean
  onCloseSettingsModal: () => void
  onCloseWorldContextModal: () => void
  availableModels?: UserModelsPayload
  modelsLoaded: boolean
  artStyle: string | null | undefined
  analysisModel: string | null | undefined
  characterModel: string | null | undefined
  locationModel: string | null | undefined
  storyboardModel: string | null | undefined
  editModel: string | null | undefined
  videoModel: string | null | undefined
  audioModel: string | null | undefined
  capabilityOverrides: CapabilitySelections
  videoRatio: string | null | undefined
  genrePack: string | null | undefined
  ttsRate: string | null | undefined
  onUpdateConfig: (key: string, value: unknown) => Promise<void>
  globalAssetText: string
  capsuleNavItems: Array<{
    id: string
    icon: string
    label: string
    status: 'empty' | 'active' | 'processing' | 'ready'
    disabled?: boolean
    disabledLabel?: string
  }>
  currentStage: string
  onStageChange: (stage: string) => void
  projectId: string
  episodeId?: string
  onOpenAssetLibrary: () => void
  onOpenSettingsModal: () => void
  onRefresh: () => void
  assetLibraryLabel: string
  settingsLabel: string
  refreshTitle: string
  children: ReactNode
}

export default function WorkspaceHeaderShell({
  isSettingsModalOpen,
  isWorldContextModalOpen,
  onCloseSettingsModal,
  onCloseWorldContextModal,
  availableModels,
  modelsLoaded,
  artStyle,
  analysisModel,
  characterModel,
  locationModel,
  storyboardModel,
  editModel,
  videoModel,
  audioModel,
  capabilityOverrides,
  videoRatio,
  genrePack,
  ttsRate,
  onUpdateConfig,
  globalAssetText,
  capsuleNavItems,
  currentStage,
  onStageChange,
  onOpenAssetLibrary,
  onOpenSettingsModal,
  onRefresh,
  assetLibraryLabel,
  settingsLabel,
  refreshTitle,
  children,
}: WorkspaceHeaderShellProps) {
  return (
    <>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={onCloseSettingsModal}
        availableModels={availableModels}
        modelsLoaded={modelsLoaded}
        artStyle={artStyle ?? undefined}
        analysisModel={analysisModel ?? undefined}
        characterModel={characterModel ?? undefined}
        locationModel={locationModel ?? undefined}
        imageModel={storyboardModel ?? undefined}
        editModel={editModel ?? undefined}
        videoModel={videoModel ?? undefined}
        audioModel={audioModel ?? undefined}
        videoRatio={videoRatio ?? undefined}
        genrePack={genrePack ?? undefined}
        capabilityOverrides={capabilityOverrides}
        ttsRate={ttsRate ?? undefined}
        onArtStyleChange={(value) => { onUpdateConfig('artStyle', value) }}
        onAnalysisModelChange={(value) => { onUpdateConfig('analysisModel', value) }}
        onCharacterModelChange={(value) => { onUpdateConfig('characterModel', value) }}
        onLocationModelChange={(value) => { onUpdateConfig('locationModel', value) }}
        onImageModelChange={(value) => { onUpdateConfig('storyboardModel', value) }}
        onEditModelChange={(value) => { onUpdateConfig('editModel', value) }}
        onVideoModelChange={(value) => { onUpdateConfig('videoModel', value) }}
        onAudioModelChange={(value) => { onUpdateConfig('audioModel', value) }}
        onVideoRatioChange={(value) => { onUpdateConfig('videoRatio', value) }}
        onGenrePackChange={(value) => { onUpdateConfig('genrePack', value) }}
        onCapabilityOverridesChange={(value) => { onUpdateConfig('capabilityOverrides', value) }}
        onTTSRateChange={(value) => { onUpdateConfig('ttsRate', value) }}
      />

      <WorldContextModal
        isOpen={isWorldContextModalOpen}
        onClose={onCloseWorldContextModal}
        text={globalAssetText}
        onChange={(value) => { onUpdateConfig('globalAssetText', value) }}
      />

      <div className="workspace-split">
        <div className="workspace-split__main min-w-0 flex-1">
          <div className="workspace-toolbar">
            <WorkspaceStageSwitcher
              items={capsuleNavItems}
              activeId={resolveCapsuleActiveId(currentStage)}
              onStageChange={onStageChange}
            />

            <div className="min-h-[2.75rem] flex-1" />

            <WorkspaceTopActions
              placement="inline"
              onOpenAssetLibrary={onOpenAssetLibrary}
              onOpenSettings={onOpenSettingsModal}
              onRefresh={onRefresh}
              assetLibraryLabel={assetLibraryLabel}
              settingsLabel={settingsLabel}
              refreshTitle={refreshTitle}
            />
          </div>

          <div className="workspace-split__stage">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
