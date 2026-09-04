'use client'

import { AppIcon } from '@/components/ui/icons'
import { GlassButton } from '@/components/ui/primitives'

interface StoryboardGroupStaleAlertProps {
  title: string
  detail: string
  regenerateLabel: string
  dismissLabel: string
  regenerating?: boolean
  onRegenerate: () => void
  onDismiss: () => void
}

export default function StoryboardGroupStaleAlert({
  title,
  detail,
  regenerateLabel,
  dismissLabel,
  regenerating = false,
  onRegenerate,
  onDismiss,
}: StoryboardGroupStaleAlertProps) {
  return (
    <div className="mb-4 rounded-lg border border-[var(--glass-stroke-warning,var(--glass-stroke-base))] bg-[var(--glass-tone-warning-bg,var(--glass-bg-muted))] p-3">
      <div className="flex items-start gap-3">
        <AppIcon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--film-gold)]" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-[var(--glass-text-primary)]">{title}</h4>
          <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">{detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <GlassButton
              variant="primary"
              size="sm"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              <AppIcon name="refresh" className="h-3 w-3" />
              <span>{regenerateLabel}</span>
            </GlassButton>
            <GlassButton variant="secondary" size="sm" onClick={onDismiss} disabled={regenerating}>
              {dismissLabel}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  )
}
