'use client'

import { useTranslations } from 'next-intl'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { useWizardState } from './smart-import/hooks/useWizardState'
import StepSource from './smart-import/steps/StepSource'
import StepParse from './smart-import/steps/StepParse'
import StepMapping from './smart-import/steps/StepMapping'
import StepConfirm from './smart-import/steps/StepConfirm'
import type { SplitEpisode } from './smart-import/types'

export type { SplitEpisode } from './smart-import/types'

interface SmartImportWizardProps {
  onManualCreate: () => void
  onImportComplete: (episodes: SplitEpisode[]) => void
  projectId: string
  importStatus?: string | null
  /** 预填文本：传入后自动走本地章节标记分集 */
  initialRawContent?: string
}

export default function SmartImportWizard({
  onManualCreate,
  onImportComplete,
  projectId,
  importStatus,
  initialRawContent,
}: SmartImportWizardProps) {
  const t = useTranslations('smartImport')
  const wizard = useWizardState({ projectId, importStatus, onImportComplete, t, initialRawContent })

  const savingTaskState = wizard.saving
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'build',
      resource: 'text',
      hasOutput: false,
    })
    : null

  const showProgressModal = wizard.stage === 'analyzing' || wizard.stage === 'preview'

  return (
    <>
      <StepSource
        onManualCreate={onManualCreate}
        fileName={wizard.fileName}
        rawContent={wizard.rawContent}
        importing={wizard.importing}
        error={wizard.error}
        onImportFile={(file) => { void wizard.handleImportFile(file) }}
        onClearFile={wizard.clearImportedFile}
        onSplit={() => { void wizard.handleSplitCurrentContent() }}
        continueHint={wizard.appendNext}
      />

      {showProgressModal ? (
        <div
          className="fixed inset-0 z-[80] flex items-stretch justify-center p-2 sm:p-3 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={wizard.stage === 'analyzing' ? t('analyzing.title') : t('preview.title')}
        >
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--glass-text-primary)_28%,transparent)] backdrop-blur-[2px]" />

          <div className="relative z-10 flex h-full max-h-[min(98dvh,1100px)] w-full max-w-[min(98vw,1680px)] flex-col overflow-hidden rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] shadow-[var(--glass-shadow-lg)]">
            {wizard.stage === 'analyzing' ? (
              <div className="flex min-h-[320px] flex-1 items-center justify-center p-10">
                <StepParse compact />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-[var(--glass-stroke-base)] px-5 py-4 sm:px-6">
                  <StepConfirm
                    episodes={wizard.episodes}
                    saving={wizard.saving}
                    savingTaskState={savingTaskState}
                    autoSaved={wizard.autoSaved}
                    onReanalyze={wizard.handleReimport}
                    onContinueImport={() => { void wizard.handleContinueImport() }}
                    onConfirm={() => { void wizard.handleConfirm() }}
                    compact
                  />
                  {wizard.error ? (
                    <p className="mt-2 text-sm text-[var(--glass-tone-danger-fg)]">{wizard.error}</p>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden px-5 py-4 sm:px-6 sm:py-5">
                  <StepMapping
                    episodes={wizard.episodes}
                    selectedEpisode={wizard.selectedEpisode}
                    onSelectEpisode={wizard.setSelectedEpisode}
                    onUpdateEpisodeNumber={wizard.updateEpisodeNumber}
                    onUpdateEpisodeTitle={wizard.updateEpisodeTitle}
                    onUpdateEpisodeSummary={wizard.updateEpisodeSummary}
                    onUpdateEpisodeContent={wizard.updateEpisodeContent}
                    onAddEpisode={wizard.addEpisode}
                    deleteConfirm={wizard.deleteConfirm}
                    onOpenDeleteConfirm={wizard.openDeleteConfirm}
                    onCloseDeleteConfirm={wizard.closeDeleteConfirm}
                    onConfirmDeleteEpisode={wizard.confirmDeleteEpisode}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
