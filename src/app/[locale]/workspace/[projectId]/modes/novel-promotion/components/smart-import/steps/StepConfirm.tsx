'use client'

import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import type { TaskPresentationState } from '@/lib/task/presentation'
import type { SplitEpisode } from '../types'

interface StepConfirmProps {
  episodes: SplitEpisode[]
  saving: boolean
  savingTaskState: TaskPresentationState | null
  autoSaved: boolean
  onReanalyze: () => void
  onContinueImport: () => void
  onConfirm: () => void
  compact?: boolean
}

export default function StepConfirm({
  episodes,
  saving,
  savingTaskState,
  autoSaved,
  onReanalyze,
  onContinueImport,
  onConfirm,
  compact = false,
}: StepConfirmProps) {
  const t = useTranslations('smartImport')

  return (
    <div className={compact ? '' : 'mb-6 rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-6'}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="mb-1 text-xl font-medium text-[var(--glass-text-primary)] sm:text-2xl">{t('preview.title')}</h2>
          <p className="text-sm text-[var(--glass-text-secondary)] sm:text-base">
            {t('preview.episodeCount', { count: episodes.length })}，
            {t('preview.totalWords', { count: episodes.reduce((sum, ep) => sum + ep.wordCount, 0).toLocaleString() })}
            {autoSaved ? (
              <span className="ml-2 text-[var(--glass-tone-success-fg)]">{t('preview.autoSaved')}</span>
            ) : (
              <span className="ml-2 text-[var(--glass-tone-warning-fg,var(--film-gold))]">{t('preview.notSaved')}</span>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onReanalyze}
            disabled={saving}
            className="rounded-lg border border-[var(--glass-stroke-strong)] px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-[var(--glass-bg-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('preview.reanalyze')}
          </button>
          <button
            type="button"
            onClick={onContinueImport}
            disabled={saving}
            className="rounded-lg border border-[var(--glass-stroke-strong)] px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-[var(--glass-bg-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('preview.continueImport')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || episodes.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--glass-accent-from)] px-4 py-2.5 text-sm font-medium text-[var(--glass-text-on-accent)] transition-colors duration-200 hover:bg-[var(--glass-accent-to)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && (
              <TaskStatusInline
                state={savingTaskState}
                className="text-[var(--glass-text-on-accent)] [&>span]:sr-only [&_svg]:text-[var(--glass-text-on-accent)]"
              />
            )}
            {saving ? t('preview.saving') : t('preview.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
