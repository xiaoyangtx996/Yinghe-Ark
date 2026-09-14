'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { useAssetActions } from '@/lib/query/hooks'
import { useImageGenerationCount } from '@/lib/image-generation/use-image-generation-count'
import ImageGenerationInlineCountButton from '@/components/image-generation/ImageGenerationInlineCountButton'
import { getImageGenerationCountOptions } from '@/lib/image-generation/count'

export interface PropCreationModalProps {
  mode: 'asset-hub' | 'project'
  folderId?: string | null
  projectId?: string
  onClose: () => void
  onSuccess: () => void
}

export function PropCreationModal({
  mode,
  folderId,
  projectId,
  onClose,
  onSuccess,
}: PropCreationModalProps) {
  const t = useTranslations('assetModal')
  const actions = useAssetActions({
    scope: mode === 'asset-hub' ? 'global' : 'project',
    projectId,
    kind: 'prop',
  })
  const { count, setCount } = useImageGenerationCount('location')
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [artStyle, setArtStyle] = useState('american-comic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingState = isSubmitting
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'image',
      hasOutput: false,
    })
    : null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isSubmitting, onClose])

  const handleSubmit = async (generateAfterCreate: boolean) => {
    if (!name.trim() || !summary.trim() || !description.trim()) return
    try {
      setIsSubmitting(true)
      const result = await actions.create({
        name: name.trim(),
        summary: summary.trim(),
        description: description.trim(),
        folderId,
        artStyle,
      }) as { assetId?: string }
      if (generateAfterCreate) {
        if (!result.assetId) {
          throw new Error('Missing assetId from create response')
        }
        await actions.generate({
          id: result.assetId,
          artStyle,
          count,
        })
      }
      onSuccess()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4">
      <div className="glass-surface-modal max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[length:var(--glass-font-size-h3)] font-medium text-[var(--glass-text-primary)]">
              {t('prop.title')}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="glass-btn-base glass-btn-secondary glass-btn-icon rounded-full text-[var(--glass-text-primary)]"
              aria-label="Close"
            >
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="glass-field-label block">
                {t('prop.name')} <span className="text-[var(--glass-tone-danger-fg)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('prop.namePlaceholder')}
                className="glass-input-base w-full px-3 py-2 text-[length:var(--glass-font-size-body)]"
              />
            </div>

          <div className="space-y-2">
            <label className="glass-field-label block">
              {t('prop.summary')} <span className="text-[var(--glass-tone-danger-fg)]">*</span>
              </label>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder={t('prop.summaryPlaceholder')}
                className="glass-textarea-base w-full h-36 px-3 py-2 text-[length:var(--glass-font-size-body)] resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="glass-field-label block">
                {t('prop.description')} <span className="text-[var(--glass-tone-danger-fg)]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('prop.descriptionPlaceholder')}
                className="glass-textarea-base w-full h-36 px-3 py-2 text-[length:var(--glass-font-size-body)] resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end p-4 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] rounded-b-[var(--glass-radius-sm)] flex-shrink-0">
          <button
            onClick={onClose}
            className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-[var(--glass-radius-sm)] text-[length:var(--glass-font-size-body)]"
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => void handleSubmit(false)}
            disabled={isSubmitting || !name.trim() || !summary.trim() || !description.trim()}
            className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-[var(--glass-radius-sm)] disabled:cursor-not-allowed text-[length:var(--glass-font-size-body)] flex items-center gap-2"
          >
            {isSubmitting ? (
              <TaskStatusInline state={submittingState} className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]" />
            ) : (
              <span>{mode === 'asset-hub' ? t('common.addOnlyToAssetHubProp') : t('common.addOnlyProp')}</span>
            )}
          </button>
          <ImageGenerationInlineCountButton
            prefix={<span>{t('common.addAndGeneratePrefix')}</span>}
            suffix={<span>{t('common.generateCountSuffix')}</span>}
            value={count}
            options={getImageGenerationCountOptions('location')}
            onValueChange={setCount}
            onClick={() => void handleSubmit(true)}
            actionDisabled={!name.trim() || !summary.trim() || !description.trim()}
            selectDisabled={isSubmitting}
            ariaLabel={t('common.selectGenerateCount')}
            className="glass-btn-base glass-btn-primary flex items-center justify-center gap-1 rounded-[var(--glass-radius-sm)] px-4 py-2 text-[length:var(--glass-font-size-body)] disabled:cursor-not-allowed"
            selectClassName="appearance-none bg-transparent border-0 pl-0 pr-3 text-[length:var(--glass-font-size-body)] font-medium text-current outline-none cursor-pointer leading-none transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
