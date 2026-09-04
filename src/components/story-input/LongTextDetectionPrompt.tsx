'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/components/ui/icons'

interface LongTextDetectionPromptCopy {
  title: string
  description: string
  strongRecommend: string
  smartSplitLabel: string
  smartSplitBadge: string
  continueLabel: string
  continueHint: string
}

interface LongTextDetectionPromptProps {
  open: boolean
  copy: LongTextDetectionPromptCopy
  onClose: () => void
  onSmartSplit: () => void
  onContinue: () => void
}

export default function LongTextDetectionPrompt({
  open,
  copy,
  onClose,
  onSmartSplit,
  onContinue,
}: LongTextDetectionPromptProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center glass-overlay p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="glass-surface-modal w-full max-w-lg rounded-2xl border border-[var(--glass-stroke-base)] p-6 shadow-[var(--glass-shadow-2)]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)]"
            >
              <AppIcon name="sparkles" className="h-5 w-5 text-[var(--film-gold)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--glass-text-primary)]">
              {copy.title}
            </h3>
          </div>

          <p className="text-sm leading-relaxed text-[var(--glass-text-secondary)]">
            {copy.description}
          </p>

          <div
            className="rounded-[var(--glass-radius-sm)] border border-[rgba(224,163,106,0.25)] p-4 text-sm leading-relaxed"
            style={{ background: 'rgba(224,163,106,0.08)' }}
          >
            <p className="font-semibold text-[var(--film-gold)]">
              {copy.strongRecommend}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={onSmartSplit}
              className="glass-btn-base glass-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base font-semibold"
            >
              <AppIcon name="sparkles" className="h-5 w-5" />
              <span>{copy.smartSplitLabel}</span>
              <span className="rounded-full bg-[rgba(26,18,12,0.18)] px-2 py-0.5 text-xs">
                {copy.smartSplitBadge}
              </span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-2.5 text-sm text-[var(--glass-text-tertiary)] transition-colors hover:text-[var(--glass-text-secondary)]"
            >
              {copy.continueLabel}
              <span className="ml-1 text-xs opacity-60">
                - {copy.continueHint}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
