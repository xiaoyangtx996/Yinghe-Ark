'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('common')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const activeItemId = items.find((item) => item.active)?.id

  useEffect(() => {
    setMobileOpen(false)
  }, [activeItemId])

  return (
    <>
      <button
        type="button"
        className="theater-secondary-toggle"
        aria-expanded={mobileOpen}
        aria-controls="theater-secondary-panel"
        onClick={() => setMobileOpen(true)}
      >
        <AppIcon name="menu" className="h-3.5 w-3.5" />
        {title}
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="theater-secondary-backdrop"
          aria-label={t('closeMenu')}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="theater-secondary-panel"
        className="theater-secondary"
        data-theater-secondary
        data-open={mobileOpen ? 'true' : 'false'}
        aria-label={title}
      >
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

        <nav className="theater-secondary__nav" aria-label={`${title} navigation`}>
          {items.map((item) => (
            <div
              key={item.id}
              className="theater-secondary__item-row"
              data-active={item.active ? 'true' : 'false'}
            >
              <button
                type="button"
                onClick={() => {
                  item.onClick?.()
                  setMobileOpen(false)
                }}
                className="theater-secondary__item"
                data-active={item.active ? 'true' : 'false'}
                aria-current={item.active ? 'page' : undefined}
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
            <p className="px-3 py-6 text-center text-xs text-[var(--glass-text-secondary)]">
              {emptyHint}
            </p>
          ) : null}
        </nav>

        {footer ? <div className="theater-secondary__footer">{footer}</div> : null}
      </aside>
    </>
  )
}
