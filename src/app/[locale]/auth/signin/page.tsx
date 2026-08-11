'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import Navbar from "@/components/Navbar"
import { Link, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

export default function SignIn() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const t = useTranslations('auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error === 'RateLimited') {
        setError(t('rateLimited'))
      } else if (result?.error) {
        setError(t('loginFailed'))
      } else {
        router.push(buildAuthenticatedHomeTarget())
        router.refresh()
      }
    } catch {
      setError(t('loginError'))
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
                {t('welcomeBack')}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--glass-text-secondary)]">{t('loginTo')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="glass-field-label mb-2 block text-xs font-medium text-[var(--glass-text-secondary)]">
                  {t('phoneNumber')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-input-base w-full px-3 py-2.5"
                  placeholder={t('passwordPlaceholder')}
                />
              </div>

              {error && (
                <div className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--glass-tone-danger-fg)_22%,transparent)] bg-[var(--glass-tone-danger-bg)] px-4 py-3 text-sm text-[var(--glass-tone-danger-fg)]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="glass-btn-base glass-btn-primary w-full px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t('loginButtonLoading') : t('loginButton')}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-[var(--glass-text-secondary)]">
              {t('noAccount')}{" "}
              <Link href={{ pathname: '/auth/signup' }} className="font-medium text-[var(--film-gold)] hover:underline">
                {t('signupNow')}
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
