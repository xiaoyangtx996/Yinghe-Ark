'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'

export type AuditEventsKind = 'login' | 'operation'

interface AuditEventRow {
  id: string
  ts: string
  level: string
  module: string
  action: string
  message: string
  userId: string | null
  username: string | null
  projectId: string | null
  success: boolean | null
  source: string
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-skeleton-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className="admin-skeleton-bar" />
            ))}
          </div>
        ))}
      </td>
    </tr>
  )
}

export function AuditEventsPanel({ kind }: { kind: AuditEventsKind }) {
  const t = useTranslations('logs')
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<AuditEventRow[]>([])
  const [totalMatched, setTotalMatched] = useState(0)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/admin/logs/events?kind=${kind}&limit=100`)
      if (!res.ok) {
        setEvents([])
        setTotalMatched(0)
        return
      }
      const data = await res.json() as { events?: AuditEventRow[]; totalMatched?: number }
      setEvents(data.events || [])
      setTotalMatched(typeof data.totalMatched === 'number' ? data.totalMatched : 0)
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const emptyTitle = kind === 'login' ? t('noLoginEvents') : t('noOperationEvents')
  const emptyDesc = kind === 'login' ? t('loginTableDesc') : t('operationTableDesc')

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('statTotal')}</p>
          <p className="admin-stat-card__value">{loading ? '—' : totalMatched}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">{t('statPage')}</p>
          <p className="admin-stat-card__value admin-stat-card__value--sm">
            {loading ? '—' : events.length}
          </p>
        </div>
      </div>

      <section className="admin-section-card admin-section-card--clip">
        <div className="admin-section-card__head">
          <div />
          <div className="admin-toolbar__actions">
            <button
              type="button"
              onClick={() => void fetchEvents()}
              className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
            >
              <AppIcon name="refresh" className="h-4 w-4" />
              {t('refresh')}
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('time')}</th>
                <th>{t('action')}</th>
                <th>{t('user')}</th>
                <th>{t('result')}</th>
                <th>{t('description')}</th>
                {kind === 'operation' ? <th>{t('project')}</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={kind === 'operation' ? 6 : 5} />
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={kind === 'operation' ? 6 : 5} className="p-0">
                    <div className="admin-empty">
                      <div className="admin-empty__icon">
                        <AppIcon name={kind === 'login' ? 'lock' : 'clipboardCheck'} className="h-5 w-5" />
                      </div>
                      <p className="admin-empty__title">{emptyTitle}</p>
                      <p className="admin-empty__desc">{emptyDesc}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap">{row.ts ? formatDateTime(row.ts) : '—'}</td>
                    <td>
                      <span className="admin-badge admin-badge--neutral">{row.action || row.module || '—'}</span>
                    </td>
                    <td>
                      <div className="text-[var(--glass-text-primary)]">{row.username || '—'}</div>
                      {row.userId ? (
                        <div className="mt-0.5 truncate font-mono text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
                          {row.userId}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {row.success == null ? (
                        <span className="text-[var(--glass-text-tertiary)]">—</span>
                      ) : row.success ? (
                        <span className="text-[var(--glass-tone-success-fg)]">{t('resultSuccess')}</span>
                      ) : (
                        <span className="text-[var(--glass-tone-danger-fg)]">{t('resultFailed')}</span>
                      )}
                    </td>
                    <td className="max-w-[280px] truncate text-[var(--glass-text-secondary)]" title={row.message}>
                      {row.message || '—'}
                    </td>
                    {kind === 'operation' ? (
                      <td className="font-mono text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
                        {row.projectId || '—'}
                      </td>
                    ) : null}
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
