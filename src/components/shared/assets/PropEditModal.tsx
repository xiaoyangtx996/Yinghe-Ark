'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { shouldShowError } from '@/lib/error-utils'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import {
  useAiModifyProjectPropDescription,
  useAiModifyPropDescription,
  useAssetActions,
} from '@/lib/query/hooks'
import { AiModifyDescriptionField } from './AiModifyDescriptionField'

export interface PropEditModalProps {
  mode: 'asset-hub' | 'project'
  propId: string
  propName: string
  summary: string
  description: string
  variantId?: string
  projectId?: string
  onClose: () => void
  onRefresh?: () => void
}

export function PropEditModal({
  mode,
  propId,
  propName,
  summary,
  description,
  variantId,
  projectId,
  onClose,
  onRefresh,
}: PropEditModalProps) {
  const t = useTranslations('assets')
  const actions = useAssetActions({
    scope: mode === 'asset-hub' ? 'global' : 'project',
    projectId,
    kind: 'prop',
  })
  const [editingName, setEditingName] = useState(propName)
  const [editingSummary, setEditingSummary] = useState(summary)
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
      intent: 'process',
      resource: 'text',
      hasOutput: false,
    })
    : null
  const aiModifyAssetHub = useAiModifyPropDescription()
  const aiModifyProject = useAiModifyProjectPropDescription(projectId ?? '')

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  const persist = async () => {
    await actions.update(propId, {
      name: editingName.trim(),
      summary: editingSummary.trim(),
    })
    if (variantId) {
      await actions.updateVariant(propId, variantId, {
        description: editingDescription.trim(),
      })
    }
    onRefresh?.()
  }

  const handleAiModify = async () => {
    if (!aiModifyInstruction.trim()) return false

    try {
      setIsAiModifying(true)
      const data = mode === 'asset-hub'
        ? await aiModifyAssetHub.mutateAsync({
          propId,
          variantId,
          currentDescription: editingDescription,
          modifyInstruction: aiModifyInstruction,
        })
        : await aiModifyProject.mutateAsync({
          propId,
          variantId,
          currentDescription: editingDescription,
          modifyInstruction: aiModifyInstruction,
        })

      if (data?.modifiedDescription) {
        setEditingDescription(data.modifiedDescription)
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

  const handleSaveOnly = async () => {
    if (!editingName.trim() || !editingSummary.trim() || !editingDescription.trim()) return
    try {
      setIsSaving(true)
      await persist()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndGenerate = async () => {
    if (!editingName.trim() || !editingSummary.trim() || !editingDescription.trim()) return
    try {
      setIsSaving(true)
      await persist()
      await actions.generate({ id: propId })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4">
      <div className="glass-surface-modal max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[length:var(--glass-font-size-h3)] font-medium text-[var(--glass-text-primary)]">
              {t('modal.editProp')} - {propName}
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
              {t('prop.name')}
            </label>
            <input
              type="text"
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              className="glass-input-base w-full px-3 py-2"
              placeholder={t('modal.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="glass-field-label block">
              {t('prop.summary')}
            </label>
            <textarea
              value={editingSummary}
              onChange={(event) => setEditingSummary(event.target.value)}
              className="glass-textarea-base h-28 w-full px-3 py-2 resize-none"
              placeholder={t('prop.summaryPlaceholder')}
            />
          </div>

          <AiModifyDescriptionField
            label={t('prop.description')}
            description={editingDescription}
            onDescriptionChange={setEditingDescription}
            descriptionPlaceholder={t('prop.descriptionPlaceholder')}
            aiInstruction={aiModifyInstruction}
            onAiInstructionChange={setAiModifyInstruction}
            aiInstructionPlaceholder={t('modal.modifyPlaceholderProp')}
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
            onClick={() => void handleSaveOnly()}
            disabled={isSaving || !editingName.trim() || !editingSummary.trim() || !editingDescription.trim()}
            className="glass-btn-base glass-btn-tone-info px-4 py-2 rounded-[var(--glass-radius-sm)] disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <TaskStatusInline state={savingState} className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]" />
            ) : (
              t('modal.saveOnly')
            )}
          </button>
          <button
            onClick={() => void handleSaveAndGenerate()}
            disabled={isSaving || !editingName.trim() || !editingSummary.trim() || !editingDescription.trim()}
            className="glass-btn-base glass-btn-primary px-4 py-2 rounded-[var(--glass-radius-sm)] disabled:cursor-not-allowed"
          >
            {t('modal.saveAndGenerate')}
          </button>
        </div>
      </div>
    </div>
  )
}
