'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import BrandLogo from '@/components/brand/BrandLogo'
import { Link, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

export default function SignIn() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const t = useTranslations('auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
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
    <div className="auth-apple glass-page min-h-dvh">
      <Navbar />
      <div className="auth-apple__stage">
        <div className="auth-apple__card">
          <div className="auth-apple__brand">
            <BrandLogo variant="horizontal" className="auth-apple__logo" priority />
          </div>

          <form onSubmit={handleSubmit} className="auth-apple__form">
            <div className="auth-apple__field">
              <label htmlFor="username" className="auth-apple__label">
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
                className="auth-apple__input"
                placeholder={t('phoneNumberPlaceholder')}
              />
            </div>

            <div className="auth-apple__field">
              <label htmlFor="password" className="auth-apple__label">
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
                className="auth-apple__input"
                placeholder={t('passwordPlaceholder')}
              />
            </div>

            {error ? (
              <div className="auth-apple__alert auth-apple__alert--danger" role="alert">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn-base glass-btn-primary auth-apple__submit"
            >
              {loading ? t('loginButtonLoading') : t('loginButton')}
            </button>
          </form>

          <p className="auth-apple__switch">
            {t('noAccount')}{' '}
            <Link href={{ pathname: '/auth/signup' }} className="auth-apple__link">
              {t('signupNow')}
            </Link>
          </p>

          <Link href={{ pathname: '/' }} className="auth-apple__home">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
