'use client'

import { AppIcon } from '@/components/ui/icons'
import {
  resolveVendorProbeSummary,
  sanitizeVendorProbeStep,
  type VendorProbeStep,
  type VendorProbeSummary,
} from '@/lib/user-api/vendor-probe-summary'

export type { VendorProbeStep, VendorProbeSummary }
export { resolveVendorProbeSummary }

interface VendorProbeReportProps {
  title: string
  summary: VendorProbeSummary
  summaryLabel: string
  testingLabel: string
  steps: readonly VendorProbeStep[]
  stepLabel: (name: string) => string
  onRetry?: () => void
  onDismiss?: () => void
  retryLabel?: string
  dismissLabel?: string
  footer?: React.ReactNode
}

export default function VendorProbeReport({
  title,
  summary,
  summaryLabel,
  testingLabel,
  steps,
  stepLabel,
  onRetry,
  onDismiss,
  retryLabel,
  dismissLabel,
  footer,
}: VendorProbeReportProps) {
  if (summary === 'idle' && steps.length === 0) return null

  const safeSteps = steps.map((step) => sanitizeVendorProbeStep(step))

  const badgeClass =
    summary === 'passed'
      ? 'admin-badge admin-badge--success'
      : summary === 'failed'
        ? 'admin-badge admin-badge--danger'
        : summary === 'partial'
          ? 'admin-badge admin-badge--neutral'
          : 'glass-chip glass-chip-info'

  return (
    <div className="mt-3 space-y-2 rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--glass-text-primary)]">{title}</p>
        <div className="flex items-center gap-1.5">
          <span className={`${badgeClass} text-[length:var(--glass-font-size-caption)]`}>{summaryLabel}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded p-1.5 text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
              aria-label={retryLabel}
              title={retryLabel}
            >
              <AppIcon name="refresh" className="h-3 w-3" />
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded p-1.5 text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
              aria-label={dismissLabel}
              title={dismissLabel}
            >
              <AppIcon name="close" className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {summary === 'testing' && steps.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-[var(--glass-text-secondary)]">
          <AppIcon name="loader" className="h-3.5 w-3.5 animate-spin" />
          {testingLabel}
        </div>
      ) : null}

      <div className="space-y-2">
        {safeSteps.map((step) => (
          <div key={step.name} className="rounded-lg bg-[var(--glass-bg-muted)]/60 px-2.5 py-2">
            <div className="flex items-start gap-2">
              {step.status === 'pass' ? (
                <AppIcon name="check" className="mt-0.5 h-3.5 w-3.5 text-[var(--glass-tone-success-fg)]" />
              ) : step.status === 'fail' ? (
                <AppIcon name="close" className="mt-0.5 h-3.5 w-3.5 text-[var(--glass-tone-danger-fg)]" />
              ) : (
                <span className="mt-0.5 h-3.5 w-3.5 rounded-full border border-[var(--glass-stroke-base)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--glass-text-primary)]">
                    {stepLabel(step.name)}
                  </span>
                  <span
                    className={`admin-badge text-[length:var(--glass-font-size-caption)] ${
                      step.status === 'pass'
                        ? 'admin-badge--success'
                        : step.status === 'fail'
                          ? 'admin-badge--danger'
                          : 'admin-badge--neutral'
                    }`}
                  >
                    {step.status === 'pass' ? 'pass' : step.status === 'fail' ? 'fail' : 'skip'}
                  </span>
                  {step.model ? (
                    <span className="font-mono text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">{step.model}</span>
                  ) : null}
                </div>
                <p
                  className={`mt-0.5 text-[length:var(--glass-font-size-caption)] ${
                    step.status === 'fail'
                      ? 'text-[var(--glass-tone-danger-fg)]'
                      : 'text-[var(--glass-text-secondary)]'
                  }`}
                >
                  {step.message}
                </p>
                {step.detail ? (
                  <p className="mt-0.5 line-clamp-3 break-all font-mono text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {footer}
    </div>
  )
}
