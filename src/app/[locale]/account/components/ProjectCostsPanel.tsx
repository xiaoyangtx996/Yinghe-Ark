'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'

interface ProjectCostRow {
  projectId: string
  projectName: string
  totalCost: number
  recordCount: number
}

function formatMoney(amount: number, currency: string): string {
  const abs = Math.abs(amount)
  if (currency === 'USD') return `$${abs.toFixed(2)}`
  return `¥${abs.toFixed(2)}`
}

export function ProjectCostsPanel() {
  const t = useTranslations('profile')
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('CNY')
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<ProjectCostRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/user/costs')
      if (!res.ok) {
        setRows([])
        setTotal(0)
        return
      }
      const data = await res.json() as {
        currency?: string
        total?: number
        byProject?: ProjectCostRow[]
      }
      setCurrency(data.currency || 'CNY')
      setTotal(typeof data.total === 'number' ? data.total : 0)
      setRows(Array.isArray(data.byProject) ? data.byProject : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('total')}</p>
          <p className="admin-stat-card__value">
            {loading ? '—' : formatMoney(total, currency)}
          </p>
          <p className="admin-stat-card__hint">{currency}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('projectDetails')}</p>
          <p className="admin-stat-card__value admin-stat-card__value--sm">
            {loading ? '—' : rows.length}
          </p>
        </div>
      </div>

      <section className="admin-section-card admin-section-card--clip">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('projectName')}</th>
                <th>{t('callCount')}</th>
                <th>{t('costAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-0">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="admin-skeleton-row">
                        <div className="admin-skeleton-bar" />
                        <div className="admin-skeleton-bar" />
                        <div className="admin-skeleton-bar" />
                      </div>
                    ))}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-0">
                    <div className="admin-empty">
                      <div className="admin-empty__icon">
                        <AppIcon name="folder" className="h-5 w-5" />
                      </div>
                      <p className="admin-empty__title">{t('noProjectCosts')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.projectId}>
                    <td className="font-medium text-[var(--glass-text-primary)]">
                      {row.projectName}
                    </td>
                    <td>{t('recordCount', { count: row.recordCount })}</td>
                    <td className="font-mono">{formatMoney(row.totalCost, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
