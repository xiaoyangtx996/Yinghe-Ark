'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

export function ReviewChecklistEntryBar({
  title,
  subtitle,
  progressLabel,
  warnHint,
  empty,
  openLabel,
  onOpen,
  llmSlot,
}: {
  title: string
  subtitle: string
  progressLabel?: string | null
  warnHint?: string | null
  empty?: boolean
  openLabel: string
  onOpen: () => void
  llmSlot?: ReactNode
}) {
  return (
    <div className="shrink-0 flex items-center gap-2 rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-3 py-2">
      <AppIcon name="badgeCheck" className="h-3.5 w-3.5 shrink-0 text-[var(--film-gold)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--glass-text-primary)]">{title}</span>
          {progressLabel && !empty ? (
            <span className="glass-chip glass-chip-neutral text-[length:var(--glass-font-size-caption)]">
              {progressLabel}
            </span>
          ) : null}
          <span className="truncate text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
            {empty ? subtitle : warnHint || subtitle}
          </span>
        </div>
      </div>
      {!empty ? (
        <div className="flex shrink-0 items-center gap-1">
          {llmSlot}
          <button
            type="button"
            onClick={onOpen}
            className="glass-btn-base glass-btn-primary rounded-[var(--glass-radius-sm)] px-2.5 py-1.5 text-xs"
          >
            {openLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function ReviewChecklistModal({
  open,
  onClose,
  title,
  subtitle,
  progressLabel,
  children,
  footerStart,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  progressLabel?: string | null
  children: ReactNode
  footerStart?: ReactNode
}) {
  const tc = useTranslations('common')

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="film-confirm-root" role="presentation">
      <button
        type="button"
        className="film-confirm-backdrop"
        aria-label={tc('close')}
        onClick={onClose}
      />
      <div
        className="glass-surface-modal relative z-[1] flex w-full max-w-lg max-h-[min(85vh,720px)] flex-col overflow-hidden rounded-[var(--glass-radius-panel)] p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-checklist-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--glass-stroke-base)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AppIcon name="badgeCheck" className="h-4 w-4 text-[var(--film-gold)]" />
              <h3
                id="review-checklist-dialog-title"
                className="text-sm font-medium text-[var(--glass-text-primary)]"
              >
                {title}
              </h3>
              {progressLabel ? (
                <span className="glass-chip glass-chip-neutral text-[length:var(--glass-font-size-caption)]">
                  {progressLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theater-secondary__icon-btn shrink-0"
            aria-label={tc('close')}
          >
            <AppIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 app-scrollbar">
          {children}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--glass-stroke-base)] px-5 py-3">
          <div className="flex items-center gap-1">{footerStart}</div>
          <button
            type="button"
            onClick={onClose}
            className="glass-btn-base glass-btn-primary rounded-[var(--glass-radius-sm)] px-3 py-1.5 text-xs"
          >
            {tc('close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
