'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import AppBootScreen from '@/components/AppBootScreen'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import { useRouter } from '@/i18n/navigation'

type LogsTab = 'operation' | 'login' | 'system'

const AuditEventsPanel = dynamic(
  () => import('./components/AuditEventsPanel').then((m) => m.AuditEventsPanel),
  { ssr: false },
)

const SystemLogsPanel = dynamic(
  () => import('./components/SystemLogsPanel').then((m) => m.SystemLogsPanel),
  { ssr: false },
)

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('logs')
  const [activeTab, setActiveTab] = useState<LogsTab>('operation')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
    }
  }, [router, session, status])

  if (status === 'loading') {
    return <AppBootScreen />
  }

  if (!session) {
    return null
  }

  const paneMeta: Record<LogsTab, { title: string; desc: string }> = {
    operation: { title: t('tabOperation'), desc: t('tabOperationDesc') },
    login: { title: t('tabLogin'), desc: t('tabLoginDesc') },
    system: { title: t('tabSystem'), desc: t('tabSystemDesc') },
  }
  const { title, desc: description } = paneMeta[activeTab]

  return (
    <div className="glass-page min-h-dvh" data-page="logs">
      <Navbar />
      <SecondarySidebar
        title={t('title')}
        description={t('subtitle')}
        items={[
          {
            id: 'operation',
            label: t('tabOperation'),
            icon: 'clipboardCheck',
            active: activeTab === 'operation',
            onClick: () => setActiveTab('operation'),
          },
          {
            id: 'login',
            label: t('tabLogin'),
            icon: 'lock',
            active: activeTab === 'login',
            onClick: () => setActiveTab('login'),
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
          {activeTab === 'operation' ? <AuditEventsPanel kind="operation" /> : null}
          {activeTab === 'login' ? <AuditEventsPanel kind="login" /> : null}
          {activeTab === 'system' ? <SystemLogsPanel /> : null}
        </div>
      </main>
    </div>
  )
}
