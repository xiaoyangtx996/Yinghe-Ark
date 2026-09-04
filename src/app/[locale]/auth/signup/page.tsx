'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import BrandLogo from '@/components/brand/BrandLogo'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'
import { apiFetch } from '@/lib/api-fetch'
import { Link, useRouter } from '@/i18n/navigation'

export default function SignUp() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const t = useTranslations('auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

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
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    <div className="auth-apple glass-page min-h-dvh">
      <Navbar />
      <div className="auth-apple__stage">
        <div className="auth-apple__card">
          <div className="auth-apple__brand">
            <BrandLogo variant="horizontal" className="auth-apple__logo" priority />
          </div>

          <form onSubmit={handleSubmit} className="auth-apple__form">
            <div className="auth-apple__field">
              <label htmlFor="name" className="auth-apple__label">
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-apple__input"
                placeholder={t('passwordMinPlaceholder')}
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="auth-apple__field">
              <label htmlFor="confirmPassword" className="auth-apple__label">
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
                className="auth-apple__input"
                placeholder={t('confirmPasswordPlaceholder')}
              />
            </div>

            {error ? (
              <div className="auth-apple__alert auth-apple__alert--danger" role="alert">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="auth-apple__alert auth-apple__alert--success" role="status">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn-base glass-btn-primary auth-apple__submit"
            >
              {loading ? t('signupButtonLoading') : t('signupButton')}
            </button>
          </form>

          <p className="auth-apple__switch">
            {t('hasAccount')}{' '}
            <Link href={{ pathname: '/auth/signin' }} className="auth-apple__link">
              {t('signinNow')}
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
