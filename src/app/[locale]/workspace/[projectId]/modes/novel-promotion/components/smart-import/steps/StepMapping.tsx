'use client'

import { useTranslations } from 'next-intl'
import type { DeleteConfirmState, SplitEpisode } from '../types'
import { AppIcon } from '@/components/ui/icons'

interface StepMappingProps {
  episodes: SplitEpisode[]
  selectedEpisode: number
  onSelectEpisode: (index: number) => void
  onUpdateEpisodeNumber: (index: number, number: number) => void
  onUpdateEpisodeTitle: (index: number, title: string) => void
  onUpdateEpisodeSummary: (index: number, summary: string) => void
  onUpdateEpisodeContent: (index: number, content: string) => void
  onAddEpisode: () => void
  deleteConfirm: DeleteConfirmState
  onOpenDeleteConfirm: (index: number, title: string) => void
  onCloseDeleteConfirm: () => void
  onConfirmDeleteEpisode: () => void
  compact?: boolean
}

export default function StepMapping({
  episodes,
  selectedEpisode,
  onSelectEpisode,
  onUpdateEpisodeNumber,
  onUpdateEpisodeTitle,
  onUpdateEpisodeSummary,
  onUpdateEpisodeContent,
  onAddEpisode,
  deleteConfirm,
  onOpenDeleteConfirm,
  onCloseDeleteConfirm,
  onConfirmDeleteEpisode,
  compact = false,
}: StepMappingProps) {
  const t = useTranslations('smartImport')
  void onUpdateEpisodeNumber

  return (
    <>
      {deleteConfirm.show ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center glass-overlay" onClick={onCloseDeleteConfirm}>
          <div className="glass-surface-modal w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--glass-tone-danger-bg)]">
                <AppIcon name="trash" className="h-6 w-6 text-[var(--glass-tone-danger-fg)]" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-[var(--glass-text-primary)]">{t('preview.deleteConfirm.title')}</h3>
              <p className="text-[var(--glass-text-secondary)]">
                {t('preview.deleteConfirm.message', { title: deleteConfirm.title })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCloseDeleteConfirm}
                className="flex-1 rounded-lg border border-[var(--glass-stroke-strong)] px-4 py-2.5 font-medium transition-colors hover:bg-[var(--glass-bg-muted)]"
              >
                {t('preview.deleteConfirm.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteEpisode}
                className="flex-1 rounded-lg bg-[var(--glass-tone-danger-fg)] px-4 py-2.5 font-medium text-[var(--glass-text-on-accent)] transition-colors"
              >
                {t('preview.deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`grid gap-5 ${compact ? 'h-full min-h-0 lg:grid-cols-[minmax(280px,360px)_1fr]' : 'lg:grid-cols-3 lg:gap-6'}`}>
        <div className={compact ? 'flex min-h-0 flex-col' : 'lg:col-span-1'}>
          <div className={`rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-4 sm:p-5 ${compact ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="text-base font-medium sm:text-lg">{t('preview.episodeList')}</h3>
              <span className="text-xs text-[var(--glass-text-tertiary)] sm:text-sm">
                {episodes.length} {t('episodes')}
              </span>
            </div>

            <div className={`space-y-2 overflow-y-auto ${compact ? 'min-h-0 flex-1' : 'max-h-[400px]'}`}>
              {episodes.map((ep, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectEpisode(idx)}
                  className={`group relative cursor-pointer rounded-xl p-3 transition-all duration-200 ${
                    selectedEpisode === idx
                      ? 'border-2 border-[var(--film-gold)] bg-[color-mix(in_srgb,var(--film-gold)_10%,var(--glass-bg-surface))]'
                      : 'border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] hover:border-[color-mix(in_srgb,var(--film-gold)_40%,var(--glass-stroke-base))]'
                  }`}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <input
                      type="text"
                      value={ep.title}
                      onChange={(e) => onUpdateEpisodeTitle(idx, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={t('preview.episodePlaceholder')}
                      className={`min-w-0 flex-1 border-b border-transparent bg-transparent text-sm font-medium outline-none hover:border-[var(--glass-stroke-strong)] focus:border-[var(--film-gold)] ${
                        selectedEpisode === idx ? 'text-[var(--glass-text-primary)]' : 'text-[var(--glass-text-secondary)]'
                      }`}
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          selectedEpisode === idx
                            ? 'bg-[var(--film-gold)] text-[var(--glass-text-on-accent)]'
                            : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)]'
                        }`}
                      >
                        {ep.wordCount.toLocaleString()} {t('upload.words')}
                      </span>
                      {episodes.length > 1 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenDeleteConfirm(idx, ep.title)
                          }}
                          className="rounded p-1 text-[var(--glass-tone-danger-fg)] opacity-0 transition-all hover:bg-[var(--glass-tone-danger-bg)] group-hover:opacity-100"
                          title={t('preview.deleteEpisode')}
                        >
                          <AppIcon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={ep.summary}
                    onChange={(e) => onUpdateEpisodeSummary(idx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t('preview.summaryPlaceholder')}
                    className="mt-0.5 w-full border-b border-transparent bg-transparent text-xs text-[var(--glass-text-tertiary)] outline-none hover:border-[var(--glass-stroke-strong)] focus:border-[var(--film-gold)]"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onAddEpisode}
              className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--glass-stroke-strong)] py-2.5 text-sm text-[var(--glass-text-tertiary)] transition-all duration-200 hover:border-[var(--film-gold)] hover:bg-[color-mix(in_srgb,var(--film-gold)_8%,transparent)] hover:text-[var(--film-gold)]"
            >
              <AppIcon name="plus" className="h-4 w-4" />
              {t('preview.addEpisode')}
            </button>

            <div className="mt-3 shrink-0 space-y-2 border-t border-[var(--glass-stroke-base)] pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--glass-text-secondary)]">{t('preview.averageWords')}</span>
                <span className="font-semibold">
                  {episodes.length > 0
                    ? Math.round(episodes.reduce((sum, ep) => sum + ep.wordCount, 0) / episodes.length).toLocaleString()
                    : 0}{' '}
                  {t('upload.words')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={compact ? 'flex min-h-0 min-w-0 flex-col' : 'lg:col-span-2'}>
          {episodes[selectedEpisode] ? (
            <div className={`rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-4 sm:p-6 ${compact ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
              <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <input
                  type="text"
                  value={episodes[selectedEpisode].title}
                  onChange={(e) => onUpdateEpisodeTitle(selectedEpisode, e.target.value)}
                  className="min-w-0 flex-1 border-b-2 border-transparent px-1 text-xl font-semibold outline-none transition-colors duration-200 hover:border-[var(--glass-stroke-base)] focus:border-[var(--film-gold)] sm:text-2xl"
                />
                <span className="shrink-0 text-sm text-[var(--glass-text-tertiary)]">
                  {episodes[selectedEpisode].wordCount.toLocaleString()} {t('upload.words')}
                </span>
              </div>

              <div className={compact ? 'flex min-h-0 flex-1 flex-col' : ''}>
                <div className="mb-2 flex shrink-0 items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--glass-text-secondary)]">{t('preview.episodeContent')}</label>
                </div>
                <textarea
                  rows={compact ? 18 : 16}
                  value={episodes[selectedEpisode].content}
                  onChange={(e) => onUpdateEpisodeContent(selectedEpisode, e.target.value)}
                  className={`w-full resize-none rounded-xl border border-[var(--glass-stroke-strong)] p-4 font-mono text-sm leading-relaxed focus:border-[var(--film-gold)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--film-gold)_25%,transparent)] ${compact ? 'min-h-0 flex-1' : ''}`}
                />
              </div>

              <div className="mt-4 shrink-0 rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-4">
                <p className="mb-2 text-sm font-medium text-[var(--glass-text-primary)]">{t('plotSummary')}</p>
                <input
                  type="text"
                  value={episodes[selectedEpisode].summary}
                  onChange={(e) => onUpdateEpisodeSummary(selectedEpisode, e.target.value)}
                  placeholder={t('preview.summaryPlaceholder')}
                  className="w-full rounded-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--film-gold)]"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
