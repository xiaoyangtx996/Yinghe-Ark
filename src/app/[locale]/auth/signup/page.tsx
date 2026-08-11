'use client'

import { useState } from "react"
import { useTranslations } from 'next-intl'
import Navbar from "@/components/Navbar"
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator"
import { apiFetch } from '@/lib/api-fetch'
import { Link, useRouter } from '@/i18n/navigation'

export default function SignUp() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const t = useTranslations('auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'))
      setLoading(false)
      return
    }

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(t('signupSuccess'))
        setTimeout(() => {
          router.push({ pathname: '/auth/signin' })
        }, 2000)
      } else {
        setError(data.message || t('signupFailed'))
      }
    } catch {
      setError(t('signupError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-page min-h-dvh">
      <Navbar />
      <div
        className="flex items-center justify-center px-4 py-12"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(224,163,106,.08), transparent 45%)',
        }}
      >
        <div className="w-full max-w-[400px]">
          <div className="glass-surface p-7 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-[28px] font-semibold text-[var(--glass-text-primary)]">
                {t('createAccount')}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--glass-text-secondary)]">{t('joinPlatform')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="glass-field-label mb-2 block text-xs font-medium text-[var(--glass-text-secondary)]">
                  {t('phoneNumber')}
                </label>
                <input
                  id="name"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="glass-input-base w-full px-3 py-2.5"
                  placeholder={t('phoneNumberPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="glass-field-label mb-2 block text-xs font-medium text-[var(--glass-text-secondary)]">
                  {t('password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-input-base w-full px-3 py-2.5"
                  placeholder={t('passwordMinPlaceholder')}
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="glass-field-label mb-2 block text-xs font-medium text-[var(--glass-text-secondary)]">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="glass-input-base w-full px-3 py-2.5"
                  placeholder={t('confirmPasswordPlaceholder')}
                />
              </div>

              {error && (
                <div className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--glass-tone-danger-fg)_22%,transparent)] bg-[var(--glass-tone-danger-bg)] px-4 py-3 text-sm text-[var(--glass-tone-danger-fg)]">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--glass-tone-success-fg)_22%,transparent)] bg-[var(--glass-tone-success-bg)] px-4 py-3 text-sm text-[var(--glass-tone-success-fg)]">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="glass-btn-base glass-btn-primary w-full px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t('signupButtonLoading') : t('signupButton')}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-[var(--glass-text-secondary)]">
              {t('hasAccount')}{" "}
              <Link href={{ pathname: '/auth/signin' }} className="font-medium text-[var(--film-gold)] hover:underline">
                {t('signinNow')}
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link href={{ pathname: '/' }} className="text-xs text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]">
                {t('backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
