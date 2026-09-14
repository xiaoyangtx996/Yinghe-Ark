'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface ConfirmDialogProps {
  show: boolean
  title: string
  message: string
  /** Optional emphasis line under the message (e.g. folder name) */
  detail?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

/**
 * Compact binary confirm for Yinghe film UI.
 * Borrows Apple’s short decision rhythm (title → consequence → cancel/confirm),
 * but uses glass surfaces, film gold, and solid action buttons — not iOS system chrome.
 */
export default function ConfirmDialog({
  show,
  title,
  message,
  detail,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'danger',
}: ConfirmDialogProps) {
  const t = useTranslations('common')

  const finalConfirmText = confirmText || t('confirm')
  const finalCancelText = cancelText || t('cancel')

  useEffect(() => {
    if (!show) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [show, onCancel, onConfirm])

  if (!show) return null

  const toneIcon =
    type === 'danger' ? 'trash' : type === 'warning' ? 'info' : 'check'
  const confirmBtnClass =
    type === 'danger'
      ? 'glass-btn-base glass-btn-tone-danger'
      : type === 'warning'
        ? 'glass-btn-base glass-btn-secondary film-confirm__btn--warning'
        : 'glass-btn-base glass-btn-primary'

  return (
    <div className="film-confirm-root" role="presentation">
      <button
        type="button"
        className="film-confirm-backdrop"
        aria-label={finalCancelText}
        onClick={onCancel}
      />

      <div
        className="film-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="film-confirm-title"
        aria-describedby={message ? 'film-confirm-message' : undefined}
        data-tone={type}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="film-confirm__mark" aria-hidden data-tone={type}>
          <AppIcon name={toneIcon} className="h-5 w-5" />
        </div>

        <div className="film-confirm__body">
          <h3 id="film-confirm-title" className="film-confirm__title">
            {title}
          </h3>
          {message ? (
            <p id="film-confirm-message" className="film-confirm__message">
              {message}
            </p>
          ) : null}
          {detail ? <p className="film-confirm__detail">{detail}</p> : null}
        </div>

        <div className="film-confirm__actions">
          <button
            type="button"
            className="glass-btn-base glass-btn-secondary film-confirm__btn"
            onClick={onCancel}
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            className={`${confirmBtnClass} film-confirm__btn`}
            onClick={onConfirm}
            autoFocus
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
