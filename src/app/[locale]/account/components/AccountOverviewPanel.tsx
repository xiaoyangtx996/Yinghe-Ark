'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'

function formatMoney(amount: number, currency: string): string {
  const abs = Math.abs(amount)
  if (currency === 'USD') return `$${abs.toFixed(2)}`
  return `¥${abs.toFixed(2)}`
}

export function AccountOverviewPanel() {
  const { data: session } = useSession()
  const t = useTranslations('profile')
  const [currency, setCurrency] = useState('CNY')
  const [balance, setBalance] = useState<number | null>(null)
  const [frozen, setFrozen] = useState<number | null>(null)
  const [totalSpent, setTotalSpent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const displayName = session?.user?.name || t('user')
  const email = session?.user?.email || ''

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiFetch('/api/user/balance')
        if (!res.ok) return
        const data = await res.json() as {
          currency?: string
          balance?: number
          frozenAmount?: number
          totalSpent?: number
        }
        if (cancelled) return
        setCurrency(data.currency || 'CNY')
        setBalance(typeof data.balance === 'number' ? data.balance : 0)
        setFrozen(typeof data.frozenAmount === 'number' ? data.frozenAmount : 0)
        setTotalSpent(typeof data.totalSpent === 'number' ? data.totalSpent : 0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__head">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
              <AppIcon name="user" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="admin-section-card__title">{t('profileInfo')}</h3>
              <p className="admin-section-card__desc">{t('profileInfoDesc')}</p>
            </div>
          </div>
        </div>
        <div className="admin-section-card__body grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="admin-tile">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--glass-text-tertiary)]">
              {t('displayName')}
            </p>
            <p className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[var(--glass-text-primary)]">
              {displayName}
            </p>
          </div>
          <div className="admin-tile">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--glass-text-tertiary)]">
              {t('email')}
            </p>
            <p className="mt-1 text-[14px] text-[var(--glass-text-secondary)]">
              {email || t('emailEmpty')}
            </p>
          </div>
        </div>
      </section>

      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__head">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
              <AppIcon name="coins" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="admin-section-card__title">{t('wallet')}</h3>
              <p className="admin-section-card__desc">{t('walletDesc')}</p>
            </div>
          </div>
        </div>
        <div className="admin-section-card__body">
          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-card__label">{t('availableBalance')}</p>
              <p className="admin-stat-card__value">
                {loading || balance == null ? '—' : formatMoney(balance, currency)}
              </p>
              <p className="admin-stat-card__hint">{currency}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-card__label">{t('frozen')}</p>
              <p className="admin-stat-card__value admin-stat-card__value--sm">
                {loading || frozen == null ? '—' : formatMoney(frozen, currency)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-card__label">{t('totalSpent')}</p>
              <p className="admin-stat-card__value admin-stat-card__value--sm">
                {loading || totalSpent == null ? '—' : formatMoney(totalSpent, currency)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--glass-text-tertiary)]">
            {t('openSourceNoBilling')}
          </p>
        </div>
      </section>
    </div>
  )
}
