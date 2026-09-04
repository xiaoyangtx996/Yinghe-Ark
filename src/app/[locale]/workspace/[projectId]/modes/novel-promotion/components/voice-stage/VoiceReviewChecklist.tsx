'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import {
  VOICE_REVIEW_GATES,
  buildVoiceReviewStorageKey,
  parseStoredVoiceCheckedGateIds,
  resolveVoiceReviewAutoHints,
  resolveVoiceReviewProgress,
  type VoiceReviewGateId,
  type VoiceReviewLineInput,
} from '@/lib/novel-promotion/voice-review-gates'
import { usePersistedReviewChecks } from '@/lib/novel-promotion/use-persisted-review-checks'

interface VoiceReviewChecklistProps {
  projectId: string
  episodeId?: string
  lines: VoiceReviewLineInput[]
}

export default function VoiceReviewChecklist({
  projectId,
  episodeId,
  lines,
}: VoiceReviewChecklistProps) {
  const t = useTranslations('voice')
  const storageKey = useMemo(
    () => buildVoiceReviewStorageKey(projectId, episodeId),
    [projectId, episodeId],
  )
  const [checkedIds, setCheckedIds] = usePersistedReviewChecks<VoiceReviewGateId>(
    storageKey,
    parseStoredVoiceCheckedGateIds,
  )
  const [collapsed, setCollapsed] = useState(true)

  const hints = useMemo(() => resolveVoiceReviewAutoHints(lines), [lines])
  const progress = useMemo(() => resolveVoiceReviewProgress(checkedIds), [checkedIds])
  const warnHints = useMemo(() => hints.filter((hint) => hint.severity === 'warn'), [hints])

  const toggleGate = useCallback((id: VoiceReviewGateId) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [setCheckedIds])

  const hasLines = lines.length > 0

  return (
    <section className="rounded-[var(--glass-radius-panel)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AppIcon name="badgeCheck" className="h-3.5 w-3.5 text-[var(--film-gold)]" />
            <h3 className="text-xs font-medium text-[var(--glass-text-primary)]">
              {t('review.title')}
            </h3>
            {hasLines ? (
              <span className="glass-chip glass-chip-neutral text-[length:var(--glass-font-size-caption)]">
                {t('review.progress', { checked: progress.checked, total: progress.total })}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">{t('review.subtitle')}</p>
        </div>
        {hasLines ? (
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="glass-btn-base glass-btn-secondary shrink-0 rounded-[var(--glass-radius-sm)] px-2.5 py-1.5 text-xs"
            aria-expanded={!collapsed}
          >
            {collapsed ? t('review.expand') : t('review.collapse')}
          </button>
        ) : null}
      </div>

      {!hasLines ? (
        <p className="mt-2 text-xs text-[var(--glass-text-tertiary)]">{t('review.empty')}</p>
      ) : (
        <>
          {collapsed && warnHints.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {warnHints.slice(0, 1).map((hint) => (
                <li
                  key={hint.id}
                  className="flex items-start gap-2 rounded-md bg-[var(--glass-bg-muted)] px-2.5 py-2 text-xs text-[var(--glass-text-secondary)]"
                >
                  <AppIcon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--film-gold)]" />
                  <span>{t(`review.hints.${hint.id}`)}</span>
                </li>
              ))}
              {warnHints.length > 1 ? (
                <li className="px-2.5 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
                  +{warnHints.length - 1}
                </li>
              ) : null}
            </ul>
          ) : null}

          <div className="review-checklist-body" data-open={collapsed ? 'false' : 'true'}>
            <div className="review-checklist-body__inner">
              <div className="mt-3 space-y-3">
          {hints.length > 0 ? (
            <ul className="space-y-1.5">
              {hints.map((hint) => (
                <li
                  key={hint.id}
                  className="flex items-start gap-2 rounded-md bg-[var(--glass-bg-muted)] px-2.5 py-2 text-xs text-[var(--glass-text-secondary)]"
                >
                  <AppIcon
                    name={hint.severity === 'warn' ? 'alert' : 'idea'}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--film-gold)]"
                  />
                  <span>{t(`review.hints.${hint.id}`)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="space-y-1.5">
            {VOICE_REVIEW_GATES.map((gate) => {
              const checked = checkedIds.includes(gate.id)
              return (
                <li key={gate.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 hover:bg-[var(--glass-bg-muted)]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => toggleGate(gate.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-[var(--glass-text-primary)]">
                        {t(`review.gates.${gate.id}.label`)}
                      </span>
                      <span className="mt-0.5 block text-[length:var(--glass-font-size-caption)] leading-relaxed text-[var(--glass-text-tertiary)]">
                        {t(`review.gates.${gate.id}.tip`)}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
