'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { ReviewChecklistEntryBar, ReviewChecklistModal } from '@/components/review/ReviewChecklistShell'
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
  const [open, setOpen] = useState(false)

  const hints = useMemo(() => resolveVoiceReviewAutoHints(lines), [lines])
  const progress = useMemo(() => resolveVoiceReviewProgress(checkedIds), [checkedIds])
  const warnHints = useMemo(() => hints.filter((hint) => hint.severity === 'warn'), [hints])

  const toggleGate = useCallback((id: VoiceReviewGateId) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [setCheckedIds])

  const hasLines = lines.length > 0

  if (!hasLines) {
    return (
      <div className="shrink-0 rounded-[var(--glass-radius-md)] border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-3 py-2 text-xs text-[var(--glass-text-tertiary)]">
        {t('review.empty')}
      </div>
    )
  }

  const progressLabel = t('review.progress', { checked: progress.checked, total: progress.total })
  const warnHint = warnHints.length > 0 ? t(`review.hints.${warnHints[0].id}`) : null

  return (
    <>
      <ReviewChecklistEntryBar
        title={t('review.title')}
        subtitle={t('review.subtitle')}
        progressLabel={progressLabel}
        warnHint={warnHint}
        openLabel={t('review.open')}
        onOpen={() => setOpen(true)}
      />
      <ReviewChecklistModal
        open={open}
        onClose={() => setOpen(false)}
        title={t('review.title')}
        subtitle={t('review.subtitle')}
        progressLabel={progressLabel}
      >
        {hints.length > 0 ? (
          <ul className="space-y-1.5">
            {hints.map((hint) => (
              <li
                key={hint.id}
                className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-xs ${
                  hint.severity === 'warn'
                    ? 'bg-[var(--glass-tone-warning-bg,var(--glass-bg-muted))] text-[var(--glass-text-secondary)]'
                    : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)]'
                }`}
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
      </ReviewChecklistModal>
    </>
  )
}
