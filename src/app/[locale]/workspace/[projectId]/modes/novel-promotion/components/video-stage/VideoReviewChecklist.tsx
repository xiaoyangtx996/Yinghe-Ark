'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import {
  VIDEO_REVIEW_GATES,
  buildVideoReviewStorageKey,
  parseStoredVideoCheckedGateIds,
  resolveVideoReviewAutoHints,
  resolveVideoReviewProgress,
  type VideoReviewGateId,
  type VideoReviewPanelInput,
} from '@/lib/novel-promotion/video-review-gates'
import { usePersistedReviewChecks } from '@/lib/novel-promotion/use-persisted-review-checks'
import { useVideoLlmReview } from '@/lib/query/mutations/useEpisodeMutations'
import type { VideoLlmFinding } from '@/lib/novel-promotion/video-llm-review'
import { extractErrorMessage } from '@/lib/errors/extract'

interface VideoReviewChecklistProps {
  projectId: string
  episodeId?: string
  panels: VideoReviewPanelInput[]
}

export default function VideoReviewChecklist({
  projectId,
  episodeId,
  panels,
}: VideoReviewChecklistProps) {
  const t = useTranslations('video')
  const storageKey = useMemo(
    () => buildVideoReviewStorageKey(projectId, episodeId),
    [projectId, episodeId],
  )
  const [checkedIds, setCheckedIds] = usePersistedReviewChecks<VideoReviewGateId>(
    storageKey,
    parseStoredVideoCheckedGateIds,
  )
  const [collapsed, setCollapsed] = useState(true)
  const [llmFindings, setLlmFindings] = useState<VideoLlmFinding[] | null>(null)
  const [llmError, setLlmError] = useState<string | null>(null)
  const llmReview = useVideoLlmReview(projectId)

  const hints = useMemo(() => resolveVideoReviewAutoHints(panels), [panels])
  const progress = useMemo(() => resolveVideoReviewProgress(checkedIds), [checkedIds])
  const warnHints = useMemo(() => hints.filter((hint) => hint.severity === 'warn'), [hints])

  const toggleGate = useCallback((id: VideoReviewGateId) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [setCheckedIds])

  const handleLlmReview = useCallback(async () => {
    if (!episodeId) {
      setLlmError(t('review.llmNeedEpisode'))
      return
    }
    setLlmError(null)
    try {
      const result = await llmReview.mutateAsync({ episodeId })
      const findings = Array.isArray(result.findings) ? (result.findings as VideoLlmFinding[]) : []
      setLlmFindings(findings)
    } catch (error: unknown) {
      setLlmFindings(null)
      setLlmError(
        t('review.llmFailed', {
          error: extractErrorMessage(error, 'Unknown error'),
        }),
      )
    }
  }, [episodeId, llmReview, t])

  const hasPanels = panels.length > 0

  return (
    <section className="rounded-[var(--glass-radius-panel)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AppIcon name="badgeCheck" className="h-3.5 w-3.5 text-[var(--film-gold)]" />
            <h3 className="text-xs font-medium text-[var(--glass-text-primary)]">
              {t('review.title')}
            </h3>
            {hasPanels ? (
              <span className="glass-chip glass-chip-neutral text-[length:var(--glass-font-size-caption)]">
                {t('review.progress', { checked: progress.checked, total: progress.total })}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">{t('review.subtitle')}</p>
        </div>
        {hasPanels ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            <button
              type="button"
              disabled={llmReview.isPending || !episodeId}
              onClick={() => void handleLlmReview()}
              className="glass-btn-base glass-btn-secondary rounded-[var(--glass-radius-sm)] px-2.5 py-1.5 text-xs"
            >
              {llmReview.isPending ? t('review.llmRunning') : t('review.llmRun')}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="glass-btn-base glass-btn-secondary rounded-[var(--glass-radius-sm)] px-2.5 py-1.5 text-xs"
              aria-expanded={!collapsed}
            >
              {collapsed ? t('review.expand') : t('review.collapse')}
            </button>
          </div>
        ) : null}
      </div>

      {!hasPanels ? (
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
            {VIDEO_REVIEW_GATES.map((gate) => {
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
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
