'use client'
import { logError as _ulogError } from '@/lib/logging/core'

/**
 * 资产中心 - 角色形象编辑弹窗
 * 与项目级资产库的 CharacterEditModal 保持一致
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { shouldShowError } from '@/lib/error-utils'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import {
    useRefreshGlobalAssets,
    useUpdateCharacterName,
    useAiModifyCharacterDescription,
    useUpdateCharacterAppearanceDescription,
} from '@/lib/query/hooks'

interface CharacterEditModalProps {
    characterId: string
    characterName: string
    appearanceIndex: number
    changeReason: string
    description: string
    onClose: () => void
    onSave: () => void  // 触发生成图片
}

export function CharacterEditModal({
    characterId,
    characterName,
    appearanceIndex,
    changeReason,
    description,
    onClose,
    onSave
}: CharacterEditModalProps) {
    // 🔥 使用 React Query
    const onRefresh = useRefreshGlobalAssets()
    const updateName = useUpdateCharacterName()
    const modifyDescription = useAiModifyCharacterDescription()
    const updateAppearanceDescription = useUpdateCharacterAppearanceDescription()
    const t = useTranslations('assets')

    const [editingName, setEditingName] = useState(characterName)
    const [editingDescription, setEditingDescription] = useState(description)
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
            intent: 'modify',
            resource: 'image',
            hasOutput: false,
        })
        : null

    // AI 修改描述
    const handleAiModify = async () => {
        if (!aiModifyInstruction.trim()) return

        try {
            setIsAiModifying(true)
            const data = await modifyDescription.mutateAsync({
                characterId,
                appearanceIndex,
                currentDescription: editingDescription,
                modifyInstruction: aiModifyInstruction,
            })
            setEditingDescription(data.modifiedDescription ?? '')
            setAiModifyInstruction('')
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                const message = error instanceof Error ? error.message : String(error)
                alert(t('modal.modifyFailed') + ': ' + message)
            }
        } finally {
            setIsAiModifying(false)
        }
    }

    // 保存名字
    const handleSaveName = () => {
        if (!editingName.trim() || editingName === characterName) return

        updateName.mutate(
            { characterId, name: editingName.trim() },
            {
                onError: (error) => {
                    if (shouldShowError(error)) {
                        alert(t('modal.saveName') + t('errors.failed'))
                    }
                }
            }
        )
    }

    // 仅保存（不生成图片）
    const handleSaveOnly = async () => {
        try {
            setIsSaving(true)

            // 如果名字变了，先保存名字
            if (editingName.trim() !== characterName) {
                await updateName.mutateAsync({ characterId, name: editingName.trim() })
            }

            // 保存描述
            await updateAppearanceDescription.mutateAsync({
                characterId,
                appearanceIndex,
                description: editingDescription,
            })

            onRefresh()
            onClose()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(t('errors.saveFailed'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    // 保存并生成图片
    const handleSaveAndGenerate = async () => {
        const descToSave = editingDescription
        const nameToSave = editingName.trim()

        // 立即关闭弹窗
        onClose()

            // 后台执行保存和生成
            ; (async () => {
                try {
                    // 如果名字变了，先保存名字
                    if (nameToSave !== characterName) {
                        await updateName.mutateAsync({ characterId, name: nameToSave })
                    }

                    // 保存描述
                    await updateAppearanceDescription.mutateAsync({
                        characterId,
                        appearanceIndex,
                        description: descToSave,
                    })

                    // 触发生成
                    onSave()
                    onRefresh()
                } catch (error: unknown) {
                    _ulogError('保存并生成失败:', error)
                    if (shouldShowError(error)) {
                        alert(t('errors.saveFailed'))
                    }
                }
            })()
    }

    return (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4">
            <div className="glass-surface-modal max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-6 space-y-4 overflow-y-auto app-scrollbar flex-1 min-h-0">
                    {/* 标题 */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-[length:var(--glass-font-size-title)] font-medium text-[var(--glass-text-primary)]">
                            {t('modal.editCharacter')} - {characterName}
                        </h3>
                        <button onClick={onClose} className="glass-btn-base glass-btn-soft h-8 w-8 rounded-full text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]">
                            <AppIcon name="close" className="w-6 h-6" />
                        </button>
                    </div>

                    {/* 角色名字编辑 */}
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
                                    disabled={updateName.isPending || !editingName.trim()}
                                    className="glass-btn-base glass-btn-tone-success px-3 py-2 rounded-lg text-sm whitespace-nowrap"
                                >
                                    {updateName.isPending ? t('smartImport.preview.saving') : t('modal.saveName')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 形象标识 */}
                    <div className="text-sm text-[var(--glass-text-secondary)]">
                        {t('character.appearance')}: <span className="font-medium text-[var(--glass-text-primary)]">{changeReason}</span>
                    </div>

                    {/* AI 修改区域 */}
                    <div className="space-y-2 glass-surface-soft p-4 rounded-lg border border-[var(--glass-stroke-base)]">
                        <label className="glass-field-label block flex items-center gap-2">
                            <AppIcon name="bolt" className="w-4 h-4" />
                            {t('modal.smartModify')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={aiModifyInstruction}
                                onChange={(e) => setAiModifyInstruction(e.target.value)}
                                placeholder={t('modal.modifyPlaceholderCharacter')}
                                className="glass-input-base flex-1 px-3 py-2"
                                disabled={isAiModifying}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleAiModify()
                                    }
                                }}
                            />
                            <button
                                onClick={handleAiModify}
                                disabled={isAiModifying || !aiModifyInstruction.trim()}
                                className="glass-btn-base glass-btn-tone-info px-4 py-2 rounded-lg disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                            >
                                {isAiModifying ? (
                                    <TaskStatusInline state={aiModifyingState} className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]" />
                                ) : (
                                    <>
                                        <AppIcon name="bolt" className="w-4 h-4" />
                                        {t('modal.smartModify')}
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="glass-field-hint">
                            {t('modal.aiTipSub')}
                        </p>
                    </div>

                    {/* 描述编辑 */}
                    <div className="space-y-2">
                        <label className="glass-field-label block">
                            {t('modal.appearancePrompt')}
                        </label>
                        <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="glass-textarea-base w-full h-64 px-3 py-2 resize-none"
                            placeholder={t('modal.descPlaceholder')}
                            disabled={isAiModifying}
                        />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-lg"
                            disabled={isSaving}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSaveOnly}
                            disabled={isSaving || !editingDescription.trim()}
                            className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-lg disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <TaskStatusInline state={savingState} className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]" />
                            ) : (
                                t('modal.saveOnly')
                            )}
                        </button>
                        <button
                            onClick={handleSaveAndGenerate}
                            disabled={isSaving || !editingDescription.trim()}
                            className="glass-btn-base glass-btn-primary px-4 py-2 rounded-lg disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {t('modal.saveAndGenerate')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CharacterEditModal
