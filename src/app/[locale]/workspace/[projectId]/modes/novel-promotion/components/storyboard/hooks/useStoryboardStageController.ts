'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  NovelPromotionStoryboard,
  NovelPromotionClip,
  Character,
  Location,
} from '@/types/project'
import { useProjectAssets } from '@/lib/query/hooks/useProjectAssets'
import {
  useUpdateProjectPhotographyPlan,
  useUpdateProjectPanelActingNotes,
} from '@/lib/query/hooks'
import { useStoryboardState } from './useStoryboardState'
import { usePanelOperations } from './usePanelOperations'
import { useStoryboardImageGeneration } from './useImageGeneration'
import { usePanelVariant } from './usePanelVariant'
import { useStoryboardTaskAwareStoryboards } from './useStoryboardTaskAwareStoryboards'
import { useStoryboardPanelAssetActions } from './useStoryboardPanelAssetActions'
import { useStoryboardStageUiState } from './useStoryboardStageUiState'
import { useStoryboardStageStatus } from './useStoryboardStageStatus'

interface UseStoryboardStageControllerProps {
  projectId: string
  episodeId: string
  initialStoryboards: NovelPromotionStoryboard[]
  clips: NovelPromotionClip[]
  isTransitioning: boolean
}

/** Keep signed assets off the first storyboard paint; warm shortly after or on demand. */
const STORYBOARD_ASSETS_WARM_MS = 2_000

export function useStoryboardStageController({
  projectId,
  episodeId,
  initialStoryboards,
  clips,
  isTransitioning,
}: UseStoryboardStageControllerProps) {
  const isRunningPhase = useCallback((phase: string | null | undefined) => {
    return phase === 'queued' || phase === 'processing'
  }, [])

  const {
    assetPickerPanel,
    setAssetPickerPanel,
    aiDataPanel,
    setAIDataPanel,
    isEpisodeBatchSubmitting,
    setIsEpisodeBatchSubmitting,
  } = useStoryboardStageUiState()

  const [assetsArmed, setAssetsArmed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setAssetsArmed(true), STORYBOARD_ASSETS_WARM_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const assetsEnabled =
    assetsArmed || Boolean(assetPickerPanel) || Boolean(aiDataPanel)

  const { data: assets } = useProjectAssets(projectId, { enabled: assetsEnabled })
  const characters: Character[] = useMemo(() => assets?.characters ?? [], [assets?.characters])
  const locations: Location[] = useMemo(() => assets?.locations ?? [], [assets?.locations])

  const { taskAwareStoryboards } = useStoryboardTaskAwareStoryboards({
    projectId,
    initialStoryboards,
    isRunningPhase,
  })

  const storyboardState = useStoryboardState({
    projectId,
    episodeId,
    initialStoryboards: taskAwareStoryboards,
    clips,
  })

  const {
    localStoryboards,
    setLocalStoryboards,
    sortedStoryboards,
    expandedClips,
    toggleExpandedClip,
    panelEditsRef,
    getClipInfo,
    getTextPanels,
    getPanelEditData,
    updatePanelEdit,
    formatClipTitle,
    totalPanels,
    storyboardStartIndex,
  } = storyboardState

  const panelOps = usePanelOperations({
    projectId,
    episodeId,
    panelEditsRef,
  })

  const {
    savingPanels,
    deletingPanelIds,
    saveStateByPanel,
    hasUnsavedByPanel,
    submittingStoryboardTextIds,
    addingStoryboardGroup,
    movingClipId,
    insertingAfterPanelId,
    savePanelWithData,
    debouncedSave,
    retrySave,
    addPanel,
    deletePanel,
    deleteStoryboard,
    regenerateStoryboardText,
    addStoryboardGroup,
    moveStoryboardGroup,
    addCharacterToPanel,
    removeCharacterFromPanel,
    setPanelLocation,
    insertPanel,
  } = panelOps

  const variantOps = usePanelVariant({
    projectId,
    episodeId,
    setLocalStoryboards,
  })

  const { submittingVariantPanelId, generatePanelVariant } = variantOps

  const imageOps = useStoryboardImageGeneration({
    projectId,
    episodeId,
    localStoryboards,
    setLocalStoryboards,
  })

  const {
    submittingStoryboardIds,
    submittingPanelImageIds,
    selectingCandidateIds,
    editingPanel,
    setEditingPanel,
    modifyingPanels,
    isDownloadingImages,
    previewImage,
    setPreviewImage,
    regeneratePanelImage,
    regenerateAllPanelsIndividually,
    selectPanelCandidate,
    selectPanelCandidateIndex,
    cancelPanelCandidate,
    getPanelCandidates,
    modifyPanelImage,
    downloadAllImages,
    clearStoryboardError,
  } = imageOps

  useEffect(() => {
    if (editingPanel) setAssetsArmed(true)
  }, [editingPanel])

  const updatePhotographyPlanMutation = useUpdateProjectPhotographyPlan(projectId)
  const updatePanelActingNotesMutation = useUpdateProjectPanelActingNotes(projectId)

  const {
    getDefaultAssetsForClip,
    handleEditSubmit,
    handlePanelUpdate,
    handleAddCharacter,
    handleSetLocation,
    handleRemoveCharacter,
    handleRemoveLocation,
    runningCount,
    pendingPanelCount,
    handleGenerateAllPanels,
  } = useStoryboardPanelAssetActions({
    clips,
    characters,
    locations,
    localStoryboards,
    sortedStoryboards,
    submittingPanelImageIds,
    editingPanel,
    setEditingPanel,
    setIsEpisodeBatchSubmitting,
    getTextPanels,
    getPanelEditData,
    updatePanelEdit,
    debouncedSave,
    regeneratePanelImage,
    modifyPanelImage,
    addCharacterToPanel,
    removeCharacterFromPanel,
    setPanelLocation,
    assetPickerPanel,
    setAssetPickerPanel,
  })

  const { addingStoryboardGroupState, transitioningState } = useStoryboardStageStatus({
    addingStoryboardGroup,
    isTransitioning,
  })

  return {
    localStoryboards, setLocalStoryboards, sortedStoryboards, expandedClips, toggleExpandedClip,
    getClipInfo, getTextPanels, getPanelEditData, updatePanelEdit, formatClipTitle, totalPanels, storyboardStartIndex,
    savingPanels, deletingPanelIds, saveStateByPanel, hasUnsavedByPanel, submittingStoryboardTextIds, addingStoryboardGroup, movingClipId, insertingAfterPanelId,
    savePanelWithData, addPanel, deletePanel, deleteStoryboard, regenerateStoryboardText, addStoryboardGroup, moveStoryboardGroup, insertPanel,
    submittingVariantPanelId, generatePanelVariant,
    submittingStoryboardIds, submittingPanelImageIds, selectingCandidateIds,
    editingPanel, setEditingPanel, modifyingPanels, isDownloadingImages, previewImage, setPreviewImage,
    regeneratePanelImage, regenerateAllPanelsIndividually, selectPanelCandidate, selectPanelCandidateIndex,
    cancelPanelCandidate, getPanelCandidates, modifyPanelImage, downloadAllImages, clearStoryboardError,
    assetPickerPanel, setAssetPickerPanel, aiDataPanel, setAIDataPanel, isEpisodeBatchSubmitting,
    getDefaultAssetsForClip, handleEditSubmit, handlePanelUpdate, handleAddCharacter, handleSetLocation, handleRemoveCharacter, handleRemoveLocation,
    retrySave,
    updatePhotographyPlanMutation, updatePanelActingNotesMutation,
    addingStoryboardGroupState, transitioningState, runningCount, pendingPanelCount, handleGenerateAllPanels,
  }
}
