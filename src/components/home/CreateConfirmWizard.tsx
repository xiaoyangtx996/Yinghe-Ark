'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { ART_STYLES, VIDEO_RATIOS } from '@/lib/constants'
import { GENRE_PACKS } from '@/lib/genre-packs'

export type CreateConfirmDraft = {
  storyText: string
  videoRatio: string
  artStyle: string
  genrePack: string
}

type Props = {
  open: boolean
  draft: CreateConfirmDraft
  onDraftChange: (next: CreateConfirmDraft) => void
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}

const STEP_KEYS = ['story', 'style', 'plan', 'summary', 'launch'] as const

export default function CreateConfirmWizard({
  open,
  draft,
  onDraftChange,
  submitting,
  onCancel,
  onConfirm,
  t,
}: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const ratioLabel = useMemo(
    () => VIDEO_RATIOS.find((r) => r.value === draft.videoRatio)?.label || draft.videoRatio,
    [draft.videoRatio],
  )
  const styleLabel = useMemo(
    () => ART_STYLES.find((s) => s.value === draft.artStyle)?.label || draft.artStyle,
    [draft.artStyle],
  )
  const genreLabel = useMemo(
    () => GENRE_PACKS.find((g) => g.value === draft.genrePack)?.label || draft.genrePack || t('summary.noGenre'),
    [draft.genrePack, t],
  )

  if (!open) return null

  const isLast = step >= STEP_KEYS.length - 1

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--glass-overlay)] p-4 backdrop-blur-[var(--glass-blur-sm)]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-confirm-title"
        className="glass-surface-modal flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--glass-radius-lg)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--glass-stroke-base)] px-5 py-4">
          <div>
            <h2 id="create-confirm-title" className="font-display text-lg font-semibold text-[var(--glass-text-primary)]">
              {t('title')}
            </h2>
            <p className="mt-1 text-xs text-[var(--glass-text-secondary)]">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="glass-icon-btn-sm"
            aria-label={t('cancel')}
          >
            <AppIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="film-stages overflow-x-auto border-b border-[var(--glass-stroke-base)] px-3 py-2" role="tablist">
          {STEP_KEYS.map((key, index) => (
            <button
              key={key}
              type="button"
              role="tab"
              data-active={index === step ? 'true' : 'false'}
              className="film-stages__item"
              disabled={submitting || index > step}
              onClick={() => {
                if (index <= step) setStep(index)
              }}
            >
              <span className="film-stages__n">{index + 1}</span>
              <span className="film-stages__t">{t(`steps.${key}`)}</span>
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--glass-text-secondary)]">{t('storyHint')}</p>
              <textarea
                value={draft.storyText}
                onChange={(e) => onDraftChange({ ...draft, storyText: e.target.value })}
                rows={8}
                className="glass-input-base min-h-[180px] w-full resize-y px-3 py-2 text-sm"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--glass-text-secondary)]">{t('genreLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {GENRE_PACKS.map((pack) => (
                    <button
                      key={pack.value}
                      type="button"
                      onClick={() => onDraftChange({ ...draft, genrePack: pack.value })}
                      className={`glass-btn-base h-auto min-h-[var(--glass-control-min-size)] flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm whitespace-normal ${
                        draft.genrePack === pack.value ? 'glass-btn-primary' : 'glass-btn-secondary'
                      }`}
                    >
                      <span className="block whitespace-nowrap font-medium [word-break:keep-all]">{pack.label}</span>
                      <span className="block whitespace-nowrap text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-text-tertiary)] [word-break:keep-all]">{pack.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--glass-text-secondary)]">{t('ratioLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      type="button"
                      onClick={() => onDraftChange({ ...draft, videoRatio: ratio.value })}
                      className={`glass-btn-base px-3 py-1.5 text-sm ${
                        draft.videoRatio === ratio.value ? 'glass-btn-primary' : 'glass-btn-secondary'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--glass-text-secondary)]">{t('styleLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {ART_STYLES.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => onDraftChange({ ...draft, artStyle: style.value })}
                      className={`glass-btn-base px-3 py-1.5 text-sm ${
                        draft.artStyle === style.value ? 'glass-btn-primary' : 'glass-btn-secondary'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <ol className="space-y-3 text-sm text-[var(--glass-text-primary)]">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-3 rounded-[var(--glass-radius-md)] bg-[var(--glass-bg-muted)] px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--glass-tone-info-bg)] text-xs font-medium text-[var(--film-gold)]">
                    {n}
                  </span>
                  <span>{t(`plan.step${n}`)}</span>
                </li>
              ))}
            </ol>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <div className="rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] p-3">
                <p className="text-xs text-[var(--glass-text-tertiary)]">{t('summary.story')}</p>
                <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-[var(--glass-text-primary)]">
                  {draft.storyText.trim() || t('summary.emptyStory')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="glass-chip glass-chip-warning text-xs">{genreLabel}</span>
                <span className="glass-chip glass-chip-info text-xs">{ratioLabel}</span>
                <span className="glass-chip glass-chip-neutral text-xs">{styleLabel}</span>
              </div>
              <p className="text-xs text-[var(--glass-text-secondary)]">{t('summary.autoRun')}</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm text-[var(--glass-text-secondary)]">
              <p>{t('launchHint')}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t('launchBullet1')}</li>
                <li>{t('launchBullet2')}</li>
                <li>{t('launchBullet3')}</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--glass-stroke-base)] px-5 py-4">
          <button
            type="button"
            className="glass-btn-base glass-btn-ghost px-3 py-2 text-sm"
            disabled={submitting || step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            {t('back')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="glass-btn-base glass-btn-secondary px-3 py-2 text-sm"
              disabled={submitting}
              onClick={onCancel}
            >
              {t('cancel')}
            </button>
            {isLast ? (
              <button
                type="button"
                className="glass-btn-base glass-btn-primary px-4 py-2 text-sm font-semibold"
                disabled={submitting || !draft.storyText.trim()}
                onClick={onConfirm}
              >
                {submitting ? t('submitting') : t('confirmStart')}
              </button>
            ) : (
              <button
                type="button"
                className="glass-btn-base glass-btn-primary px-4 py-2 text-sm font-semibold"
                disabled={step === 0 && !draft.storyText.trim()}
                onClick={() => setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1))}
              >
                {t('next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
