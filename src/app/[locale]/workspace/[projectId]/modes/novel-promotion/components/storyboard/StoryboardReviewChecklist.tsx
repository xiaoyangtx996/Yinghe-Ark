'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { ReviewChecklistEntryBar, ReviewChecklistModal } from '@/components/review/ReviewChecklistShell'
import {
  STORYBOARD_REVIEW_GATES,
  buildStoryboardReviewStorageKey,
  parseStoredStoryboardCheckedGateIds,
  resolveStoryboardReviewAutoHints,
  resolveStoryboardReviewProgress,
  type StoryboardReviewBoardInput,
  type StoryboardReviewGateId,
} from '@/lib/novel-promotion/storyboard-review-gates'
import { usePersistedReviewChecks } from '@/lib/novel-promotion/use-persisted-review-checks'
import { useStoryboardLlmReview } from '@/lib/query/mutations/useEpisodeMutations'
import type { StoryboardLlmFinding } from '@/lib/novel-promotion/storyboard-llm-review'
import { extractErrorMessage } from '@/lib/errors/extract'

interface StoryboardReviewChecklistProps {
  projectId: string
  episodeId?: string
  storyboards: StoryboardReviewBoardInput[]
}

export default function StoryboardReviewChecklist({
  projectId,
  episodeId,
  storyboards,
}: StoryboardReviewChecklistProps) {
  const t = useTranslations('storyboard')
  const storageKey = useMemo(
    () => buildStoryboardReviewStorageKey(projectId, episodeId),
    [projectId, episodeId],
  )
  const [checkedIds, setCheckedIds] = usePersistedReviewChecks<StoryboardReviewGateId>(
    storageKey,
    parseStoredStoryboardCheckedGateIds,
  )
  const [open, setOpen] = useState(false)
  const [llmFindings, setLlmFindings] = useState<StoryboardLlmFinding[] | null>(null)
  const [llmError, setLlmError] = useState<string | null>(null)
  const llmReview = useStoryboardLlmReview(projectId)

  const hints = useMemo(() => resolveStoryboardReviewAutoHints(storyboards), [storyboards])
  const progress = useMemo(() => resolveStoryboardReviewProgress(checkedIds), [checkedIds])
  const warnHints = useMemo(() => hints.filter((hint) => hint.severity === 'warn'), [hints])

  const toggleGate = useCallback((id: StoryboardReviewGateId) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [setCheckedIds])

  const hasBoards = storyboards.length > 0
  const hasPanels = storyboards.some(
    (board) => Array.isArray(board.panels) && board.panels.some((panel) => panel?.id),
  )

  const handleLlmReview = useCallback(async () => {
    if (!episodeId) {
      setLlmError(t('review.llmNeedEpisode'))
      setOpen(true)
      return
    }
    setLlmError(null)
    try {
      const result = await llmReview.mutateAsync({ episodeId })
      const findings = Array.isArray(result.findings)
        ? (result.findings as StoryboardLlmFinding[])
        : []
      setLlmFindings(findings)
      setOpen(true)
    } catch (error: unknown) {
      setLlmFindings(null)
      setLlmError(
        t('review.llmFailed', {
          error: extractErrorMessage(error, 'Unknown error'),
        }),
      )
      setOpen(true)
    }
  }, [episodeId, llmReview, t])

  if (!hasBoards) {
    return (
      <div className="shrink-0 rounded-[var(--glass-radius-md)] border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-3 py-2 text-xs text-[var(--glass-text-tertiary)]">
        {t('review.empty')}
      </div>
    )
  }

  const progressLabel = t('review.progress', { checked: progress.checked, total: progress.total })
  const warnHint = warnHints.length > 0 ? t(`review.hints.${warnHints[0].id}`) : null

  const renderLlmButton = () => (
    <button
      type="button"
      disabled={llmReview.isPending || !episodeId || !hasPanels}
      onClick={() => void handleLlmReview()}
      className="glass-btn-base glass-btn-secondary rounded-[var(--glass-radius-sm)] px-2.5 py-1.5 text-xs"
    >
      {llmReview.isPending ? t('review.llmRunning') : t('review.llmRun')}
    </button>
  )

  return (
    <>
      <ReviewChecklistEntryBar
        title={t('review.title')}
        subtitle={t('review.subtitle')}
        progressLabel={progressLabel}
        warnHint={warnHint}
        openLabel={t('review.open')}
        onOpen={() => setOpen(true)}
        llmSlot={renderLlmButton()}
      />
      <ReviewChecklistModal
        open={open}
        onClose={() => setOpen(false)}
        title={t('review.title')}
        subtitle={t('review.subtitle')}
        progressLabel={progressLabel}
        footerStart={renderLlmButton()}
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

        {llmError ? (
          <p className="rounded-md bg-[var(--glass-tone-danger-bg,var(--glass-bg-muted))] px-2.5 py-2 text-xs text-[var(--glass-tone-danger-fg)]">
            {llmError}
          </p>
        ) : null}

        {llmFindings ? (
          <div className="space-y-1.5">
            <p className="px-1 text-[length:var(--glass-font-size-caption)] font-medium text-[var(--glass-text-secondary)]">
              {t('review.llmFindingsTitle')}
            </p>
            {llmFindings.length === 0 ? (
              <p className="rounded-md bg-[var(--glass-bg-muted)] px-2.5 py-2 text-xs text-[var(--glass-text-secondary)]">
                {t('review.llmEmpty')}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {llmFindings.map((finding, index) => (
                  <li
                    key={`${finding.title}-${index}`}
                    className={`rounded-md px-2.5 py-2 text-xs ${
                      finding.severity === 'warn'
                        ? 'bg-[var(--glass-tone-warning-bg,var(--glass-bg-muted))] text-[var(--glass-text-secondary)]'
                        : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)]'
                    }`}
                  >
                    <p className="font-medium text-[var(--glass-text-primary)]">{finding.title}</p>
                    <p className="mt-0.5 leading-relaxed">{finding.detail}</p>
                    {finding.gateId ? (
                      <p className="mt-1 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
                        {t(`review.gates.${finding.gateId}.label`)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <ul className="space-y-1.5">
          {STORYBOARD_REVIEW_GATES.map((gate) => {
            const checked = checkedIds.includes(gate.id)
            return (
              <li key={gate.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-[var(--glass-bg-muted)]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGate(gate.id)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[var(--film-gold)]"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-medium ${
                        checked
                          ? 'text-[var(--glass-text-tertiary)] line-through'
                          : 'text-[var(--glass-text-primary)]'
                      }`}
                    >
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
