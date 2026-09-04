'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import { useRouter } from '@/i18n/navigation'
import { BillingRecordsPanel } from './components/BillingRecordsPanel'
import { SystemLogsPanel } from './components/SystemLogsPanel'

type LogsTab = 'billing' | 'system'

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('logs')
  const tc = useTranslations('common')
  const [activeTab, setActiveTab] = useState<LogsTab>('billing')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
    }
  }, [router, session, status])

  if (status === 'loading') {
    return (
      <div className="glass-page min-h-dvh">
        <Navbar />
        <main className="mx-auto flex h-dvh max-w-[1440px] flex-col items-center justify-center px-4 pb-4 pt-4 sm:px-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--glass-stroke-base)] border-t-[var(--glass-text-secondary)]" />
          <p className="mt-3 text-sm text-[var(--glass-text-secondary)]">{tc('loading')}</p>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="glass-page flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--glass-stroke-base)] border-t-[var(--glass-text-secondary)]" />
      </div>
    )
  }

  const title = activeTab === 'billing' ? t('tabBilling') : t('tabSystem')
  const description = activeTab === 'billing' ? t('tabBillingDesc') : t('tabSystemDesc')

  return (
    <div className="glass-page min-h-dvh">
      <Navbar />
      <SecondarySidebar
        title={t('title')}
        description={t('subtitle')}
        items={[
          {
            id: 'billing',
            label: t('tabBilling'),
            icon: 'receipt',
            active: activeTab === 'billing',
            onClick: () => setActiveTab('billing'),
          },
          {
            id: 'system',
            label: t('tabSystem'),
            icon: 'fileText',
            active: activeTab === 'system',
            onClick: () => setActiveTab('system'),
          },
        ]}
      />

      <main className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 pb-4 pt-4 sm:px-6" aria-labelledby="logs-pane-title">
        <header className="admin-page-header">
          <div>
            <p className="mb-1 text-[length:var(--glass-font-size-caption)] font-medium uppercase tracking-[0.1em] text-[var(--film-gold)]">
              {t('title')}
            </p>
            <h1 id="logs-pane-title" className="admin-page-header__title">{title}</h1>
            <p className="admin-page-header__desc">{description}</p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {activeTab === 'billing' ? <BillingRecordsPanel /> : <SystemLogsPanel />}
        </div>
      </main>
    </div>
  )
}
