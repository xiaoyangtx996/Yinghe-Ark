'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect } from 'react'
import LanguageSwitcher from './LanguageSwitcher'
import BrandIcon from '@/components/brand/BrandIcon'
import { AppIcon } from '@/components/ui/icons'
import RailUserMenu from '@/components/RailUserMenu'
import { brandAssetUrl, brandLogo } from '@/lib/brand/assets'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import BrandLogo from '@/components/brand/BrandLogo'

const RAIL_PREFETCH_PATHS = [
  '/workspace',
  '/workspace/asset-hub',
  '/workspace/films',
  '/logs',
  '/profile',
  '/account',
] as const

export default function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const homeTarget = buildAuthenticatedHomeTarget()
  const isAuthed = status === 'authenticated' && !!session

  // Warm secondary route chunks after first paint so rail clicks hit a warm cache.
  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      for (const path of RAIL_PREFETCH_PATHS) {
        try {
          router.prefetch(path)
        } catch {
          // ignore
        }
      }
    }
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2500 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }
    const timer = window.setTimeout(run, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [isAuthed, router])

  // Session resolving: never show guest top bar or theater rail skeletons
  if (status === 'loading') {
    return null
  }

  const isActive = (target: string) => {
    if (target === '/workspace') {
      // Project list + project detail share the Projects rail item
      if (pathname === '/workspace') return true
      if (!pathname.startsWith('/workspace/')) return false
      if (pathname.startsWith('/workspace/asset-hub')) return false
      if (pathname.startsWith('/workspace/films')) return false
      return true
    }
    if (target === '/workspace/asset-hub') {
      return pathname === '/workspace/asset-hub' || pathname.startsWith('/workspace/asset-hub/')
    }
    if (target === '/workspace/films') {
      return pathname === '/workspace/films' || pathname.startsWith('/workspace/films/')
    }
    if (target === '/logs') {
      return pathname === '/logs' || pathname.startsWith('/logs/')
    }
    if (target === '/profile') {
      return pathname === '/profile' || pathname.startsWith('/profile/')
    }
    if (target === '/account') {
      return pathname === '/account' || pathname.startsWith('/account/')
    }
    return pathname === target
  }

  return (
    <>
      {isAuthed ? (
        <aside className="theater-rail" data-theater-rail aria-label={t('railPrimary')}>
          <Link
            href={homeTarget}
            className="theater-rail__brand"
            aria-label={t('railBrandHome')}
            prefetch
          >
            <Image
              src={brandAssetUrl(brandLogo.iconApp)}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
          </Link>
          <Link
            href={{ pathname: '/workspace' }}
            className="theater-rail__link"
            data-active={isActive('/workspace') ? 'true' : 'false'}
            aria-label={t('railProjects')}
            prefetch
          >
            <BrandIcon name="project" size={22} />
            <span className="rail-tip" role="tooltip">{t('railProjects')}</span>
          </Link>
          <Link
            href={{ pathname: '/workspace/asset-hub' }}
            className="theater-rail__link"
            data-active={isActive('/workspace/asset-hub') ? 'true' : 'false'}
            aria-label={t('railAssets')}
            prefetch
          >
            <BrandIcon name="assets" size={22} />
            <span className="rail-tip" role="tooltip">{t('railAssets')}</span>
          </Link>
          <Link
            href={{ pathname: '/workspace/films' }}
            className="theater-rail__link"
            data-active={isActive('/workspace/films') ? 'true' : 'false'}
            aria-label={t('railFilms')}
            prefetch
          >
            <AppIcon name="film" className="h-[22px] w-[22px] shrink-0" />
            <span className="rail-tip" role="tooltip">{t('railFilms')}</span>
          </Link>
          <Link
            href={{ pathname: '/logs' }}
            className="theater-rail__link"
            data-active={isActive('/logs') ? 'true' : 'false'}
            aria-label={t('railLogs')}
            prefetch
          >
            <BrandIcon name="logs" size={22} />
            <span className="rail-tip" role="tooltip">{t('railLogs')}</span>
          </Link>
          <div className="theater-rail__spacer" />
          <Link
            href={{ pathname: '/profile' }}
            className="theater-rail__link"
            data-active={isActive('/profile') ? 'true' : 'false'}
            aria-label={t('railSettings')}
            prefetch
          >
            <BrandIcon name="settings" size={22} />
            <span className="rail-tip" role="tooltip">{t('railSettings')}</span>
          </Link>
          <RailUserMenu />
        </aside>
      ) : null}

      {!isAuthed ? (
        <nav className="glass-nav sticky top-0 z-50">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href={{ pathname: '/' }}
              className="flex items-center py-1"
              aria-label={tc('appName')}
            >
              <BrandLogo variant="horizontal" className="max-h-8" priority />
            </Link>

            <div className="flex items-center gap-3 sm:gap-4">
              <>
                <LanguageSwitcher />
                <Link
                  href={{ pathname: '/auth/signin' }}
                  className="text-sm font-medium text-[var(--glass-text-secondary)] transition-colors hover:text-[var(--glass-text-primary)]"
                >
                  {t('signin')}
                </Link>
                <Link
                  href={{ pathname: '/auth/signup' }}
                  className="glass-btn-base glass-btn-primary px-4 py-2 text-sm font-medium"
                >
                  {t('signup')}
                </Link>
              </>
            </div>
          </div>
        </nav>
      ) : null}
    </>
  )
}
