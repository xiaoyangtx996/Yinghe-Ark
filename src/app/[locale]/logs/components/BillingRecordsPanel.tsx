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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--glass-stroke-base)] pb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--glass-text-secondary)]">
            {tb('transactionType')}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="glass-input-base min-w-[140px] px-3 py-2 text-sm"
            >
              <option value="all">{tb('allTypes')}</option>
              <option value="recharge">{tb('income')}</option>
              <option value="consume">{tb('expense')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--glass-text-secondary)]">
            {tb('startDate')}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass-input-base px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--glass-text-secondary)]">
            {tb('endDate')}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="glass-input-base px-3 py-2 text-sm"
            />
          </label>
          <button type="button" onClick={handleFilter} className="glass-btn-base glass-btn-primary px-4 py-2 text-sm">
            {tb('filter')}
          </button>
          <button type="button" onClick={handleReset} className="glass-btn-base glass-btn-secondary px-4 py-2 text-sm">
            {tb('reset')}
          </button>
        </div>
        <button type="button" onClick={() => void handleExportCsv()} className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <AppIcon name="download" className="h-4 w-4" />
          {t('exportCsv')}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--glass-bg-canvas)] text-[12px] uppercase tracking-[0.04em] text-[var(--glass-text-secondary)]">
            <tr>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('time')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('type')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('amount')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('project')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('action')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('detail')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('balanceAfter')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[var(--glass-text-tertiary)]">{t('loading')}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[var(--glass-text-tertiary)]">{tb('noRecords')}</td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-[var(--glass-stroke-base)]/70 hover:bg-[var(--glass-bg-muted)]/60">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--glass-text-secondary)]">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3 text-[var(--glass-text-primary)]">{typeLabel(row.type)}</td>
                  <td className={`px-4 py-3 font-mono ${row.amount < 0 ? 'text-[var(--glass-tone-danger-fg)]' : 'text-[var(--glass-tone-success-fg)]'}`}>
                    {formatMoney(row.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-[var(--glass-text-secondary)]">
                    <div>{row.projectName || '—'}</div>
                    {row.episodeNumber != null ? (
                      <div className="text-[11px] text-[var(--glass-text-tertiary)]">
                        {tp('episodeLabel', { number: row.episodeNumber })}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--glass-text-secondary)]">{actionLabel(row.action)}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[var(--glass-text-tertiary)]" title={detailText(row.billingMeta)}>
                    {detailText(row.billingMeta)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--glass-text-secondary)]">{formatMoney(row.balanceAfter, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--glass-text-secondary)]">
          <span>{tp('pagination', { total: pagination.total, page: pagination.page, totalPages: pagination.totalPages })}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void fetchTransactions(pagination.page - 1, applied)}
              className="glass-btn-base glass-btn-secondary px-3 py-1.5 disabled:opacity-40"
            >
              {tp('previousPage')}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void fetchTransactions(pagination.page + 1, applied)}
              className="glass-btn-base glass-btn-secondary px-3 py-1.5 disabled:opacity-40"
            >
              {tp('nextPage')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
