'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'

export function AccountSecurityPanel() {
  const t = useTranslations('profile')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 6) {
      setError(ta('passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(ta('passwordMismatch'))
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { message?: string } | null
        setError(data?.message || t('passwordChangeFailed'))
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
    } catch {
      setError(t('passwordChangeFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="admin-section-card !flex-none max-w-xl">
        <div className="admin-section-card__head">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
              <AppIcon name="lock" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="admin-section-card__title">{t('security')}</h3>
              <p className="admin-section-card__desc">{t('securityDesc')}</p>
            </div>
          </div>
        </div>
        <form className="admin-section-card__body space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <label className="admin-field block">
            {t('currentPassword')}
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="glass-input-base mt-1.5 w-full px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="admin-field block">
            {t('newPassword')}
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="glass-input-base mt-1.5 w-full px-3 py-2 text-sm"
              required
              minLength={6}
            />
          </label>
          <label className="admin-field block">
            {t('confirmNewPassword')}
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="glass-input-base mt-1.5 w-full px-3 py-2 text-sm"
              required
              minLength={6}
            />
          </label>

          {error ? (
            <p className="text-sm text-[var(--glass-tone-danger-fg)]">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-[var(--glass-tone-success-fg)]">{t('passwordChangeSuccess')}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="glass-btn-base glass-btn-primary mt-1 px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? tc('loading') : t('changePassword')}
          </button>
        </form>
      </section>
    </div>
  )
}
