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
  const [addProviderOpen, setAddProviderOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  useEffect(() => {
    if (pane !== 'providers') setAddProviderOpen(false)
  }, [pane])

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
            className="glass-btn-base glass-btn-ghost flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-[var(--glass-tone-danger-fg)]"
          >
            <AppIcon name="logout" className="h-4 w-4" />
            {t('logout')}
          </button>
        )}
      />

      <main className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 pb-4 pt-4 sm:px-6">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-header__title">{paneTitle}</h1>
            <p className="admin-page-header__desc">
              {pane === 'basic'
                ? t('basicSettingsDesc')
                : pane === 'defaults'
                  ? ta('defaultModel.hint')
                  : ta('providerPoolDesc')}
            </p>
          </div>
          {pane === 'providers' ? (
            <div className="admin-page-header__actions">
              <button
                type="button"
                onClick={() => setAddProviderOpen(true)}
                className="glass-btn-base glass-btn-primary shrink-0 cursor-pointer px-3.5 py-2 text-sm font-semibold"
              >
                {ta('addGeminiProvider')}
              </button>
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {pane === 'basic' ? (
            <BasicSettingsPanel />
          ) : (
            <ApiConfigTab
              pane={pane}
              addProviderOpen={addProviderOpen}
              onAddProviderOpenChange={setAddProviderOpen}
            />
          )}
        </div>
      </main>
    </div>
  )
}
