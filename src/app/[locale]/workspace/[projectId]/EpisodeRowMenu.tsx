'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

export function EpisodeRowMenu({
  episodeId,
  episodeName,
  onRename,
  onDelete,
}: {
  episodeId: string
  episodeName: string
  onRename: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
}) {
  const t = useTranslations('workspaceDetail.sidebar')
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onPointerDown = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        menuRef.current?.contains(event.target as Node)
      ) {
        return
      }
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="theater-secondary__icon-btn"
        title={t('moreActions')}
        aria-label={t('moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <AppIcon name="moreVertical" className="h-3.5 w-3.5" />
      </button>

      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] min-w-[132px] rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-modal)] py-1.5 shadow-[var(--glass-shadow-md)]"
              style={{ top: menuPos.top, right: menuPos.right }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--glass-text-primary)] transition-colors hover:bg-[var(--glass-bg-muted)]"
                onClick={() => {
                  setOpen(false)
                  onRename(episodeId, episodeName)
                }}
              >
                <AppIcon name="edit" className="h-3.5 w-3.5 text-[var(--glass-text-tertiary)]" />
                <span>{t('rename')}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--glass-tone-danger-fg)] transition-colors hover:bg-[var(--glass-bg-muted)]"
                onClick={() => {
                  setOpen(false)
                  onDelete(episodeId, episodeName)
                }}
              >
                <AppIcon name="trash" className="h-3.5 w-3.5" />
                <span>{t('delete')}</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
