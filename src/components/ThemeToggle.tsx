'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

export type ThemeMode = 'light' | 'dark'

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

export default function ThemeToggle() {
  const t = useTranslations('nav')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const next = getPreferredTheme()
    setTheme(next)
    applyTheme(next)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const label = theme === 'dark' ? t('themeToLight') : t('themeToDark')

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="glass-btn-base glass-btn-secondary inline-flex h-9 w-9 items-center justify-center rounded-lg p-0"
      title={label}
      aria-label={label}
      aria-pressed={theme === 'dark'}
    >
      {mounted && theme === 'dark' ? (
        <AppIcon name="sun" className="h-4 w-4" />
      ) : (
        <AppIcon name="moon" className="h-4 w-4" />
      )}
    </button>
  )
}
