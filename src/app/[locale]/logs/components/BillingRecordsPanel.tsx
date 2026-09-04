'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'

interface TransactionItem {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  action: string | null
  projectName: string | null
  episodeNumber: number | null
  episodeName: string | null
  billingMeta: Record<string, unknown> | null
  createdAt: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function formatMoney(amount: number, currency: string): string {
  const abs = Math.abs(amount)
  const prefix = amount < 0 ? '-' : amount > 0 && currency !== 'CNY' ? '+' : amount > 0 ? '+' : ''
  if (currency === 'USD') return `${prefix}$${abs.toFixed(2)}`
  return `${prefix}¥${abs.toFixed(2)}`
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function toCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-skeleton-row">
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className="admin-skeleton-bar" />
            ))}
          </div>
        ))}
      </td>
    </tr>
  )
}

export function BillingRecordsPanel() {
  const t = useTranslations('logs')
  const tb = useTranslations('billing')
  const tp = useTranslations('profile')

  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('CNY')
  const [items, setItems] = useState<TransactionItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [type, setType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [applied, setApplied] = useState({ type: 'all', startDate: '', endDate: '' })

  const fetchTransactions = useCallback(async (
    page: number,
    filters: { type: string; startDate: string; endDate: string },
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        type: filters.type,
      })
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const res = await apiFetch(`/api/user/transactions?${params.toString()}`)
      if (!res.ok) {
        setItems([])
        return
      }
      const data = await res.json() as {
        currency?: string
        transactions?: TransactionItem[]
        pagination?: Pagination
      }
      setCurrency(data.currency || 'CNY')
      setItems(data.transactions || [])
      if (data.pagination) setPagination(data.pagination)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTransactions(1, { type: 'all', startDate: '', endDate: '' })
  }, [fetchTransactions])

  const actionLabel = useCallback((action: string | null) => {
    if (!action) return '—'
    const map = tp.raw('actionTypes') as Record<string, string>
    return map[action] || action
  }, [tp])

  const typeLabel = useCallback((value: string) => {
    if (value === 'recharge') return tp('recharge')
    if (value === 'consume') return tp('consume')
    return value
  }, [tp])

  const filterLabel = useMemo(() => {
    if (applied.type === 'recharge') return tb('income')
    if (applied.type === 'consume') return tb('expense')
    return t('statFilterAll')
  }, [applied.type, t, tb])

  const handleFilter = () => {
    const next = { type, startDate, endDate }
    setApplied(next)
    void fetchTransactions(1, next)
  }

  const handleReset = () => {
    setType('all')
    setStartDate('')
    setEndDate('')
    const next = { type: 'all', startDate: '', endDate: '' }
    setApplied(next)
    void fetchTransactions(1, next)
  }

  const handleExportCsv = async () => {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '1000',
      type: applied.type,
    })
    if (applied.startDate) params.set('startDate', applied.startDate)
    if (applied.endDate) params.set('endDate', applied.endDate)
    const res = await apiFetch(`/api/user/transactions?${params.toString()}`)
    if (!res.ok) return
    const data = await res.json() as { transactions?: TransactionItem[]; currency?: string }
    const rows = data.transactions || []
    const cur = data.currency || currency
    const header = [
      t('time'),
      t('type'),
      t('amount'),
      t('balanceAfter'),
      t('project'),
      t('episode'),
      t('action'),
      t('description'),
    ]
    const lines = [
      header.map(toCsvCell).join(','),
      ...rows.map((row) => [
        formatDateTime(row.createdAt),
        typeLabel(row.type),
        formatMoney(row.amount, cur),
        formatMoney(row.balanceAfter, cur),
        row.projectName || '',
        row.episodeNumber != null ? String(row.episodeNumber) : '',
        actionLabel(row.action),
        row.description || '',
      ].map(toCsvCell).join(',')),
    ]
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `billing-records-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const detailText = useMemo(() => {
    return (meta: Record<string, unknown> | null) => {
      if (!meta) return '—'
      const parts: string[] = []
      if (typeof meta.model === 'string') parts.push(meta.model)
      if (typeof meta.resolution === 'string') parts.push(meta.resolution)
      if (typeof meta.quantity === 'number') parts.push(String(meta.quantity))
      return parts.length ? parts.join(' · ') : '—'
    }
  }, [])

  const dateRangeLabel = [applied.startDate, applied.endDate].filter(Boolean).join(' → ') || '—'

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('statTotal')}</p>
          <p className="admin-stat-card__value">{loading ? '—' : pagination.total}</p>
          <p className="admin-stat-card__hint">{currency}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('statPage')}</p>
          <p className="admin-stat-card__value admin-stat-card__value--sm">{loading ? '—' : items.length}</p>
          <p className="admin-stat-card__hint">
            {pagination.page}/{Math.max(pagination.totalPages, 1)}
          </p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('statFilter')}</p>
          <span className="admin-badge admin-badge--neutral">{filterLabel}</span>
          <p className="admin-stat-card__value admin-stat-card__value--meta">{dateRangeLabel}</p>
        </div>
      </div>

      <section className="admin-section-card admin-section-card--clip">
        <div className="admin-toolbar">
          <div className="admin-toolbar__filters">
            <label className="admin-field">
              {tb('transactionType')}
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="glass-input-base min-w-[140px] px-3 py-2 text-sm font-normal"
              >
                <option value="all">{tb('allTypes')}</option>
                <option value="recharge">{tb('income')}</option>
                <option value="consume">{tb('expense')}</option>
              </select>
            </label>
            <label className="admin-field">
              {tb('startDate')}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="glass-input-base px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="admin-field">
              {tb('endDate')}
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="glass-input-base px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>
          <div className="admin-toolbar__actions">
            <button type="button" onClick={handleFilter} className="glass-btn-base glass-btn-primary px-4 py-2 text-sm">
              {tb('filter')}
            </button>
            <button type="button" onClick={handleReset} className="glass-btn-base glass-btn-secondary px-4 py-2 text-sm">
              {tb('reset')}
            </button>
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
            >
              <AppIcon name="download" className="h-4 w-4" />
              {t('exportCsv')}
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('time')}</th>
                <th>{t('type')}</th>
                <th>{t('amount')}</th>
                <th>{t('project')}</th>
                <th>{t('action')}</th>
                <th>{t('detail')}</th>
                <th>{t('balanceAfter')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div className="admin-empty">
                      <div className="admin-empty__icon">
                        <AppIcon name="receipt" className="h-5 w-5" />
                      </div>
                      <p className="admin-empty__title">{tb('noRecords')}</p>
                      <p className="admin-empty__desc">{t('tableDesc')}</p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="glass-btn-base glass-btn-secondary mt-4 px-4 py-2 text-sm"
                      >
                        {tb('reset')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td>
                      <span className="admin-badge admin-badge--neutral">
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className={`font-mono ${row.amount < 0 ? 'text-[var(--glass-tone-danger-fg)]' : 'text-[var(--glass-tone-success-fg)]'}`}>
                      {formatMoney(row.amount, currency)}
                    </td>
                    <td>
                      <div className="text-[var(--glass-text-primary)]">{row.projectName || '—'}</div>
                      {row.episodeNumber != null ? (
                        <div className="mt-0.5 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)]">
                          {tp('episodeLabel', { number: row.episodeNumber })}
                        </div>
                      ) : null}
                    </td>
                    <td>{actionLabel(row.action)}</td>
                    <td
                      className="line-clamp-2 max-w-[240px] whitespace-normal text-[var(--glass-text-tertiary)]"
                      title={detailText(row.billingMeta)}
                    >
                      {detailText(row.billingMeta)}
                    </td>
                    <td className="font-mono">{formatMoney(row.balanceAfter, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total > 0 ? (
          <div className="admin-footer">
            <span>{tp('pagination', { total: pagination.total, page: pagination.page, totalPages: pagination.totalPages })}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => void fetchTransactions(pagination.page - 1, applied)}
                className="glass-btn-base glass-btn-secondary px-3 py-1.5"
              >
                {tp('previousPage')}
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => void fetchTransactions(pagination.page + 1, applied)}
                className="glass-btn-base glass-btn-secondary px-3 py-1.5"
              >
                {tp('nextPage')}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
