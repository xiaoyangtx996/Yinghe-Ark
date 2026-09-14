'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import AppBootScreen from '@/components/AppBootScreen'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'

type AccountPane =
  | 'center'
  | 'security'
  | 'recharge'
  | 'billing'
  | 'projects'

const AccountOverviewPanel = dynamic(
  () => import('./components/AccountOverviewPanel').then((m) => m.AccountOverviewPanel),
  { ssr: false },
)
const AccountSecurityPanel = dynamic(
  () => import('./components/AccountSecurityPanel').then((m) => m.AccountSecurityPanel),
  { ssr: false },
)
const BillingRecordsPanel = dynamic(
  () => import('./components/BillingRecordsPanel').then((m) => m.BillingRecordsPanel),
  { ssr: false },
)
const ProjectCostsPanel = dynamic(
  () => import('./components/ProjectCostsPanel').then((m) => m.ProjectCostsPanel),
  { ssr: false },
)

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('profile')
  const tn = useTranslations('nav')
  const [pane, setPane] = useState<AccountPane>('center')

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

  const displayName = session.user?.name || t('user')

  const paneMeta: Record<AccountPane, { title: string; desc: string }> = {
    center: { title: t('personalCenter'), desc: t('personalCenterDesc') },
    security: { title: t('security'), desc: t('securityDesc') },
    recharge: { title: t('rechargeRecords'), desc: t('rechargeRecordsDesc') },
    billing: { title: t('billingRecords'), desc: t('billingRecordsDesc') },
    projects: { title: t('projectDetails'), desc: t('projectDetailsDesc') },
  }
  const { title: paneTitle, desc: paneDesc } = paneMeta[pane]

  return (
    <div className="glass-page min-h-dvh" data-page="account">
      <Navbar />
      <SecondarySidebar
        title={tn('railAccount')}
        description={displayName}
        items={[
          {
            id: 'center',
            label: t('personalCenter'),
            icon: 'user',
            active: pane === 'center',
            onClick: () => setPane('center'),
          },
          {
            id: 'security',
            label: t('security'),
            icon: 'lock',
            active: pane === 'security',
            onClick: () => setPane('security'),
          },
          {
            id: 'recharge',
            label: t('rechargeRecords'),
            icon: 'coins',
            active: pane === 'recharge',
            onClick: () => setPane('recharge'),
          },
          {
            id: 'billing',
            label: t('billingRecords'),
            icon: 'receipt',
            active: pane === 'billing',
            onClick: () => setPane('billing'),
          },
          {
            id: 'projects',
            label: t('projectDetails'),
            icon: 'folder',
            active: pane === 'projects',
            onClick: () => setPane('projects'),
          },
        ]}
        footer={(
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="glass-btn-base glass-btn-ghost flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-[var(--glass-tone-danger-fg)]"
          >
            <AppIcon name="logout" className="h-4 w-4" />
            {t('logout')}
          </button>
        )}
      />

      <main
        className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 pb-4 pt-4 sm:px-6"
        aria-labelledby="account-pane-title"
      >
        <header className="admin-page-header">
          <div>
            <p className="mb-1 text-[length:var(--glass-font-size-caption)] font-medium uppercase tracking-[0.1em] text-[var(--film-gold)]">
              {tn('railAccount')}
            </p>
            <h1 id="account-pane-title" className="admin-page-header__title">
              {paneTitle}
            </h1>
            <p className="admin-page-header__desc">{paneDesc}</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {pane === 'center' ? <AccountOverviewPanel /> : null}
          {pane === 'security' ? <AccountSecurityPanel /> : null}
          {pane === 'recharge' ? <BillingRecordsPanel initialType="recharge" /> : null}
          {pane === 'billing' ? <BillingRecordsPanel initialType="consume" /> : null}
          {pane === 'projects' ? <ProjectCostsPanel /> : null}
        </div>
      </main>
    </div>
  )
}
