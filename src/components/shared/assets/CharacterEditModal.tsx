'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { shouldShowError } from '@/lib/error-utils'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import {
    useAiModifyCharacterDescription,
    useAiModifyProjectAppearanceDescription,
    useUpdateCharacterAppearanceDescription,
    useUpdateCharacterName,
    useUpdateProjectAppearanceDescription,
    useUpdateProjectCharacterIntroduction,
    useUpdateProjectCharacterName,
} from '@/lib/query/hooks'
import { AiModifyDescriptionField } from './AiModifyDescriptionField'

export interface CharacterEditModalProps {
    mode: 'asset-hub' | 'project'
    characterId: string
    characterName: string
    description: string
    appearanceIndex?: number
    changeReason?: string
    projectId?: string
    appearanceId?: string
    descriptionIndex?: number
    isTaskRunning?: boolean
    introduction?: string | null
    onClose: () => void
    onSave: (characterId: string, appearanceId: string) => void
    onUpdate?: (newDescription: string) => void
    onIntroductionUpdate?: (newIntroduction: string) => void
    onNameUpdate?: (newName: string) => void
    onRefresh?: () => void
}

export function CharacterEditModal({
    mode,
    characterId,
    characterName,
    description,
    appearanceIndex,
    changeReason,
    projectId,
    appearanceId,
    descriptionIndex,
    isTaskRunning = false,
    introduction,
    onClose,
    onSave,
    onUpdate,
    onIntroductionUpdate,
    onNameUpdate,
    onRefresh,
}: CharacterEditModalProps) {
    const t = useTranslations('assets')

    const appearanceKey = mode === 'asset-hub'
        ? String(appearanceIndex ?? 0)
        : String(appearanceId ?? '')

    const [editingName, setEditingName] = useState(characterName)
    const [editingDescription, setEditingDescription] = useState(description)
    const [editingIntroduction, setEditingIntroduction] = useState(introduction || '')
    const [aiModifyInstruction, setAiModifyInstruction] = useState('')
    const [isAiModifying, setIsAiModifying] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const aiModifyingState = isAiModifying
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'modify',
            resource: 'image',
            hasOutput: true,
        })
        : null
    const savingState = isSaving
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: 'text',
            hasOutput: false,
        })
        : null
    const taskRunningState = isTaskRunning
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'modify',
            resource: 'image',
            hasOutput: true,
        })
        : null

    const updateAssetHubName = useUpdateCharacterName()
    const updateProjectName = useUpdateProjectCharacterName(projectId ?? '')
    const updateAssetHubAppearanceDesc = useUpdateCharacterAppearanceDescription()
    const updateProjectAppearanceDesc = useUpdateProjectAppearanceDescription(projectId ?? '')
    const updateProjectIntroduction = useUpdateProjectCharacterIntroduction(projectId ?? '')
    const aiModifyAssetHub = useAiModifyCharacterDescription()
    const aiModifyProject = useAiModifyProjectAppearanceDescription(projectId ?? '')

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error instanceof Error && error.message) return error.message
        return fallback
    }

    const persistNameIfNeeded = async () => {
        const nextName = editingName.trim()
        if (!nextName || nextName === characterName) return

        if (mode === 'asset-hub') {
            await updateAssetHubName.mutateAsync({ characterId, name: nextName })
        } else {
            await updateProjectName.mutateAsync({ characterId, name: nextName })
        }
        onNameUpdate?.(nextName)
    }

    const persistDescription = async () => {
        if (mode === 'asset-hub') {
            await updateAssetHubAppearanceDesc.mutateAsync({
                characterId,
                appearanceIndex: appearanceIndex ?? 0,
                description: editingDescription,
            })
            return
        }

        if (!appearanceId) {
            throw new Error('Missing appearanceId')
        }
        await updateProjectAppearanceDesc.mutateAsync({
            characterId,
            appearanceId,
            description: editingDescription,
            descriptionIndex,
        })
    }

    const persistIntroductionIfNeeded = async () => {
        if (mode !== 'project' || !projectId) return
        if (editingIntroduction === (introduction || '')) return

        const nextIntro = editingIntroduction.trim()
        await updateProjectIntroduction.mutateAsync({
            characterId,
            introduction: nextIntro,
        })
        onIntroductionUpdate?.(nextIntro)
    }

    const handleAiModify = async () => {
        if (!aiModifyInstruction.trim()) return false

        try {
            setIsAiModifying(true)

            if (mode === 'asset-hub') {
                const data = await aiModifyAssetHub.mutateAsync({
                    characterId,
                    appearanceIndex: appearanceIndex ?? 0,
                    currentDescription: editingDescription,
                    modifyInstruction: aiModifyInstruction,
                })
                if (data?.modifiedDescription) {
                    setEditingDescription(data.modifiedDescription)
                    onUpdate?.(data.modifiedDescription)
                    setAiModifyInstruction('')
                    return true
                }
                return false
            }

            if (!appearanceId) throw new Error('Missing appearanceId')
            const data = await aiModifyProject.mutateAsync({
                characterId,
                appearanceId,
                currentDescription: editingDescription,
                modifyInstruction: aiModifyInstruction,
            })
            if (data?.modifiedDescription) {
                setEditingDescription(data.modifiedDescription)
                onUpdate?.(data.modifiedDescription)
                setAiModifyInstruction('')
                return true
            }
            return false
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(`${t('modal.modifyFailed')}: ${getErrorMessage(error, t('errors.failed'))}`)
            }
            return false
        } finally {
            setIsAiModifying(false)
        }
    }

    const handleSaveName = async () => {
        try {
            await persistNameIfNeeded()
            onRefresh?.()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(t('modal.saveName') + t('errors.failed'))
            }
        }
    }

    const handleSaveOnly = async () => {
        try {
            setIsSaving(true)
            await persistNameIfNeeded()
            await persistDescription()
            await persistIntroductionIfNeeded()

            onUpdate?.(editingDescription)
            onRefresh?.()
            onClose()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(getErrorMessage(error, t('errors.saveFailed')))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveAndGenerate = async () => {
        const savedDescription = editingDescription
        const savedAppearanceKey = appearanceKey
        onClose()

        ; (async () => {
            try {
                await persistNameIfNeeded()
                await persistDescription()
                await persistIntroductionIfNeeded()

                onUpdate?.(savedDescription)
                onRefresh?.()
                onSave(characterId, savedAppearanceKey)
            } catch (error: unknown) {
                if (shouldShowError(error)) {
                    alert(getErrorMessage(error, t('errors.saveFailed')))
                }
            }
        })()
    }

    return (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4">
            <div className="glass-surface-modal max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[length:var(--glass-font-size-h3)] font-medium text-[var(--glass-text-primary)]">
                            {t('modal.editCharacter')} - {characterName}
                        </h3>
                        <button
                            onClick={onClose}
                            className="glass-btn-base glass-btn-soft w-9 h-9 rounded-full text-[var(--glass-text-tertiary)]"
                        >
                            <AppIcon name="close" className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="glass-field-label block">
                            {t('character.name')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="glass-input-base flex-1 px-3 py-2"
                                placeholder={t('modal.namePlaceholder')}
                            />
                            {editingName !== characterName && (
                                <button
                                    onClick={handleSaveName}
                                    disabled={updateAssetHubName.isPending || updateProjectName.isPending || !editingName.trim()}
                                    className="glass-btn-base glass-btn-tone-success px-3 py-2 rounded-[var(--glass-radius-sm)] disabled:cursor-not-allowed text-[length:var(--glass-font-size-body)] whitespace-nowrap"
                                >
                                    {(updateAssetHubName.isPending || updateProjectName.isPending)
                                        ? t('smartImport.preview.saving')
                                        : t('modal.saveName')}
                                </button>
                            )}
                        </div>
                    </div>

                    {mode === 'project' && (
                        <div className="space-y-2">
                            <label className="glass-field-label block">
                                {t('modal.introduction')}
                            </label>
                            <textarea
                                value={editingIntroduction}
                                onChange={(e) => setEditingIntroduction(e.target.value)}
                                rows={3}
                                className="glass-textarea-base w-full px-3 py-2 resize-none"
                                placeholder={t('modal.introductionPlaceholder')}
                            />
                            <p className="glass-field-hint">
                                {t('modal.introductionTip')}
                            </p>
                        </div>
                    )}

                    {mode === 'asset-hub' && changeReason && (
                        <div className="text-[length:var(--glass-font-size-body)] text-[var(--glass-text-secondary)]">
                            {t('character.appearance')}:
                            <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 bg-[var(--glass-tone-neutral-bg)] text-[var(--glass-tone-neutral-fg)]">
                                {changeReason}
                            </span>
                        </div>
                    )}

                    <AiModifyDescriptionField
                        label={t('modal.appearancePrompt')}
                        description={editingDescription}
                        onDescriptionChange={setEditingDescription}
                        descriptionPlaceholder={t('modal.descPlaceholder')}
                        descriptionHeightClassName="h-64"
                        aiInstruction={aiModifyInstruction}
                        onAiInstructionChange={setAiModifyInstruction}
                        aiInstructionPlaceholder={t('modal.modifyPlaceholderCharacter')}
                        onAiModify={handleAiModify}
                        isAiModifying={isAiModifying}
                        aiModifyingState={aiModifyingState}
                        actionLabel={t('modal.modifyDescription')}
                        cancelLabel={t('common.cancel')}
                    />
                </div>

                <div className="flex gap-3 justify-end p-4 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] rounded-b-lg flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-[var(--glass-radius-sm)]"
                        disabled={isSaving}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSaveOnly}
                        disabled={isSaving || !editingDescription.trim()}
                        className="glass-btn-base glass-btn-tone-info px-4 py-2 rounded-[var(--glass-radius-sm)] disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <TaskStatusInline state={savingState} className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]" />
                        ) : (
                            t('modal.saveOnly')
                        )}
                    </button>
                    <button
                        onClick={handleSaveAndGenerate}
                        disabled={isSaving || isTaskRunning || !editingDescription.trim()}
                        className="glass-btn-base glass-btn-primary px-4 py-2 rounded-[var(--glass-radius-sm)] disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isTaskRunning ? (
                            <TaskStatusInline state={taskRunningState} className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]" />
                        ) : (
                            t('modal.saveAndGenerate')
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
