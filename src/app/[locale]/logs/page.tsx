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

  if (status === 'loading' || !session) {
    return (
      <div className="glass-page flex min-h-dvh items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

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

      <main className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 border-b border-[var(--glass-stroke-base)] pb-4">
          <h1 className="font-display text-[22px] font-semibold text-[var(--glass-text-primary)]">
            {activeTab === 'billing' ? t('tabBilling') : t('tabSystem')}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'billing' ? <BillingRecordsPanel /> : <SystemLogsPanel />}
        </div>
      </main>
    </div>
  )
}
