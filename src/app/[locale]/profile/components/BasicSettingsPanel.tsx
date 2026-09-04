'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ThemeMode } from '@/components/ThemeToggle'

const STORAGE_KEY = 'yinghe-ark-theme'
const LEGACY_STORAGE_KEY = 'waoowaoo-theme'

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.dataset.theme = mode
}

function readStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // ignore
  }
  return null
}

function getPreferredTheme(): ThemeMode {
  const stored = readStoredTheme()
  if (stored) return stored
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function BasicSettingsPanel() {
  const t = useTranslations('profile')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const next = getPreferredTheme()
    setTheme(next)
    applyTheme(next)
    setMounted(true)
  }, [])

  const setThemeMode = (next: ThemeMode) => {
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const activeTheme = mounted ? theme : 'light'

  return (
    <div className="space-y-4">
      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__head">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
              <AppIcon name="sliders" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="admin-section-card__title">{t('basicSettings')}</h3>
              <p className="admin-section-card__desc">{t('basicSettingsDesc')}</p>
            </div>
          </div>
        </div>
        <div className="admin-section-card__body grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="admin-tile flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)]">
                <AppIcon name={activeTheme === 'dark' ? 'moon' : 'sun'} className="h-4 w-4 text-[var(--film-gold)]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-[var(--glass-text-primary)]">{t('appearance')}</h4>
                <p className="text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)]">
                  {t('appearanceDesc')}
                </p>
              </div>
            </div>
            <SegmentedControl
              size="lg"
              aria-label={t('appearance')}
              value={activeTheme}
              onChange={(val) => setThemeMode(val as ThemeMode)}
              options={[
                {
                  value: 'light',
                  label: (
                    <>
                      <AppIcon name="sun" className="h-4 w-4" />
                      {t('themeLight')}
                    </>
                  ),
                },
                {
                  value: 'dark',
                  label: (
                    <>
                      <AppIcon name="moon" className="h-4 w-4" />
                      {t('themeDark')}
                    </>
                  ),
                },
              ]}
            />
          </div>

          <div className="admin-tile flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)]">
                <AppIcon name="globe" className="h-4 w-4 text-[var(--film-gold)]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-[var(--glass-text-primary)]">{t('language')}</h4>
                <p className="text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)]">
                  {t('languageDesc')}
                </p>
              </div>
            </div>
            <LanguageSwitcher hideIcon className="w-full min-h-[44px] justify-between" />
          </div>
        </div>
      </section>
    </div>
  )
}
