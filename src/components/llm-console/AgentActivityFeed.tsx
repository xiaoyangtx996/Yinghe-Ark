'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { ActivityFeedItem } from '@/lib/llm-console/agent-activity-feed'

interface AgentActivityFeedProps {
  items: ActivityFeedItem[]
  activeId?: string
  onSelect?: (id: string) => void
  onRetry?: (id: string) => void
  resolveTitle: (title: string) => string
}

function layerChipClass(layer: ActivityFeedItem['layer']): string {
  if (layer === 'understand') return 'glass-chip glass-chip-info'
  if (layer === 'check') return 'glass-chip glass-chip-success'
  return 'glass-chip glass-chip-warning'
}

export default function AgentActivityFeed({
  items,
  activeId,
  onSelect,
  onRetry,
  resolveTitle,
}: AgentActivityFeedProps) {
  const t = useTranslations('progress')

  if (items.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--glass-text-tertiary)]">
        {t('activityFeed.empty')}
      </p>
    )
  }

  return (
    <ul className="space-y-1 p-2">
      {items.map((item) => {
        const isActive = item.id === activeId
        const interactive = typeof onSelect === 'function'
        const showRetry =
          item.status === 'failed'
          && item.retryable !== false
          && typeof onRetry === 'function'
        return (
          <li key={item.id}>
            <div
              className={`rounded-[var(--glass-radius-md)] px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-[var(--glass-tone-info-bg)]'
                  : 'hover:bg-[var(--glass-bg-muted)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                disabled={!interactive}
                className={`flex w-full items-start gap-3 text-left ${
                  interactive ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className={`${layerChipClass(item.layer)} shrink-0 text-[length:var(--glass-font-size-caption)]`}>
                  {t(`activityFeed.layer.${item.layer}`)}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      item.status === 'pending'
                        ? 'text-[var(--glass-text-tertiary)]'
                        : 'text-[var(--glass-text-primary)]'
                    }`}
                  >
                    {resolveTitle(item.title)}
                  </p>
                  {item.subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-[var(--glass-text-tertiary)]">
                      {resolveTitle(item.subtitle)}
                    </p>
                  ) : null}
                </div>
                {item.status === 'done' ? (
                  <AppIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--glass-tone-success-fg)]" />
                ) : item.status === 'active' ? (
                  <AppIcon name="loader" className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--film-gold)]" />
                ) : item.status === 'failed' ? (
                  <AppIcon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--glass-tone-danger-fg)]" />
                ) : (
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-[var(--glass-stroke-base)]" />
                )}
              </button>
              {showRetry ? (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    className="glass-btn-base glass-btn-primary rounded-md px-2.5 py-1 text-[length:var(--glass-font-size-caption)]"
                  >
                    {t('runConsole.retry')}
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
