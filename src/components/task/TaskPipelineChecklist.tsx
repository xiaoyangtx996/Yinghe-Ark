'use client'

import { AppIcon } from '@/components/ui/icons'
import type { PipelineChecklistItem } from '@/lib/task/pipeline-checklist'

interface TaskPipelineChecklistProps {
  items: PipelineChecklistItem[]
  labels: Record<PipelineChecklistItem['id'], string>
  title: string
  subtitle?: string
}

function rowClass(status: PipelineChecklistItem['status']) {
  if (status === 'active') {
    return 'flex items-center gap-3 rounded-[var(--glass-radius-md)] bg-[var(--glass-tone-info-bg)] px-3 py-2 text-sm'
  }
  if (status === 'pending') {
    return 'flex items-center gap-3 rounded-[var(--glass-radius-md)] px-3 py-2 text-sm opacity-60'
  }
  return 'flex items-center gap-3 rounded-[var(--glass-radius-md)] px-3 py-2 text-sm'
}

export default function TaskPipelineChecklist({
  items,
  labels,
  title,
  subtitle,
}: TaskPipelineChecklistProps) {
  const doneCount = items.filter((item) => item.status === 'done').length
  const pct = Math.round((doneCount / Math.max(items.length, 1)) * 100)

  return (
    <div className="glass-surface mx-auto mb-4 w-full max-w-xl rounded-[var(--glass-radius-lg)] p-4 shadow-[var(--glass-shadow-md)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[var(--glass-text-secondary)]">{subtitle}</p>
          ) : null}
        </div>
        <span className="font-display text-lg font-medium tabular-nums text-[var(--film-gold)]">{pct}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg-muted)]">
        <div className="h-full rounded-full bg-[var(--film-gold)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className={rowClass(item.status)}>
            {item.status === 'done' ? (
              <AppIcon name="check" className="h-4 w-4 shrink-0 text-[var(--glass-tone-success-fg)]" />
            ) : item.status === 'active' ? (
              <AppIcon name="loader" className="h-4 w-4 shrink-0 animate-spin text-[var(--film-gold)]" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--glass-stroke-base)]" />
            )}
            <span className="text-[var(--glass-text-primary)]">{labels[item.id]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
