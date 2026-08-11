'use client'

import type { ReactNode } from 'react'
import { AppIcon, type AppIconName } from '@/components/ui/icons'

export interface SecondaryMenuItem {
  id: string
  label: string
  icon?: AppIconName
  active?: boolean
  onClick?: () => void
  trailing?: ReactNode
}

interface SecondarySidebarProps {
  title: string
  description?: string
  headerAction?: ReactNode
  items: SecondaryMenuItem[]
  emptyHint?: string
  footer?: ReactNode
}

export function SecondarySidebar({
  title,
  description,
  headerAction,
  items,
  emptyHint,
  footer,
}: SecondarySidebarProps) {
  return (
    <aside className="theater-secondary" data-theater-secondary aria-label={title}>
      <div className="theater-secondary__header">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="theater-secondary__title">{title}</h2>
            {description ? (
              <p className="theater-secondary__desc">{description}</p>
            ) : null}
          </div>
          {headerAction ? (
            <div className="shrink-0 pt-0.5">{headerAction}</div>
          ) : null}
        </div>
      </div>

      <nav className="theater-secondary__nav" aria-label={title}>
        {items.map((item) => (
          <div
            key={item.id}
            className="theater-secondary__item-row"
            data-active={item.active ? 'true' : 'false'}
          >
            <button
              type="button"
              onClick={item.onClick}
              className="theater-secondary__item"
              data-active={item.active ? 'true' : 'false'}
            >
              {item.icon ? <AppIcon name={item.icon} className="h-4 w-4 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
            </button>
            {item.trailing ? (
              <div className="theater-secondary__trailing">{item.trailing}</div>
            ) : null}
          </div>
        ))}
        {items.length === 0 && emptyHint ? (
          <p className="px-3 py-6 text-center text-xs text-[var(--glass-text-tertiary)]">
            {emptyHint}
          </p>
        ) : null}
      </nav>

      {footer ? <div className="theater-secondary__footer">{footer}</div> : null}
    </aside>
  )
}
