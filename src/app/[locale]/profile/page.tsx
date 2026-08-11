'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import ApiConfigTab from './components/ApiConfigTab'
import { BasicSettingsPanel } from './components/BasicSettingsPanel'
import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'

type SettingsPane = 'basic' | 'defaults' | 'providers'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('profile')
  const ta = useTranslations('apiConfig')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  const [pane, setPane] = useState<SettingsPane>('basic')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  if (status === 'loading' || !session) {
    return (
      <div className="glass-page flex min-h-dvh items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  const displayName = session.user?.name || t('user')

  const paneTitle =
    pane === 'basic'
      ? t('basicSettings')
      : pane === 'defaults'
        ? ta('defaultModels')
        : ta('providerPool')

  return (
    <div className="glass-page min-h-dvh">
      <Navbar />
      <SecondarySidebar
        title={tn('railSettings')}
        description={`${displayName} · ${t('personalAccount')}`}
        items={[
          {
            id: 'basic',
            label: t('basicSettings'),
            icon: 'sliders',
            active: pane === 'basic',
            onClick: () => setPane('basic'),
          },
          {
            id: 'defaults',
            label: ta('defaultModels'),
            icon: 'settingsHex',
            active: pane === 'defaults',
            onClick: () => setPane('defaults'),
          },
          {
            id: 'providers',
            label: ta('providerPool'),
            icon: 'cube',
            active: pane === 'providers',
            onClick: () => setPane('providers'),
          },
        ]}
        footer={(
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="glass-btn-base glass-btn-tone-danger flex w-full items-center justify-center gap-2 px-3 py-2 text-sm"
          >
            <AppIcon name="logout" className="h-4 w-4" />
            {t('logout')}
          </button>
        )}
      />

      <main className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 border-b border-[var(--glass-stroke-base)] pb-4">
          <h1 className="font-display text-[22px] font-semibold text-[var(--glass-text-primary)]">
            {paneTitle}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {pane === 'basic' ? (
            <BasicSettingsPanel />
          ) : (
            <ApiConfigTab pane={pane} />
          )}
        </div>
      </main>
    </div>
  )
}
