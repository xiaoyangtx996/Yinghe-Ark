'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { AppIcon } from '@/components/ui/icons'
import type { ThemeMode } from '@/components/ThemeToggle'

const STORAGE_KEY = 'waoowaoo-theme'

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.dataset.theme = mode
}

function readStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
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

  return (
    <div className="space-y-6">
      <p className="text-[13px] leading-relaxed text-[var(--glass-text-secondary)]">
        {t('basicSettingsDesc')}
      </p>

      <section className="border-b border-[var(--glass-stroke-base)] pb-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
            <AppIcon name={theme === 'dark' ? 'moon' : 'sun'} className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('appearance')}</h3>
            <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{t('appearanceDesc')}</p>
          </div>
        </div>

        <div className="inline-flex rounded-[10px] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-1">
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors ${
              mounted && theme === 'light'
                ? 'bg-[var(--glass-bg-surface-strong)] text-[var(--glass-text-primary)] shadow-[var(--glass-shadow-sm)]'
                : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
            }`}
            aria-pressed={theme === 'light'}
          >
            <AppIcon name="sun" className="h-4 w-4" />
            {t('themeLight')}
          </button>
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors ${
              mounted && theme === 'dark'
                ? 'bg-[var(--glass-bg-surface-strong)] text-[var(--glass-text-primary)] shadow-[var(--glass-shadow-sm)]'
                : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
            }`}
            aria-pressed={theme === 'dark'}
          >
            <AppIcon name="moon" className="h-4 w-4" />
            {t('themeDark')}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
            <AppIcon name="globe" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('language')}</h3>
            <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{t('languageDesc')}</p>
          </div>
        </div>

        <LanguageSwitcher />
      </section>
    </div>
  )
}
