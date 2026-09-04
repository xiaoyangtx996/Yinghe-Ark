'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import LanguageSwitcher from './LanguageSwitcher'
import BrandIcon from '@/components/brand/BrandIcon'
import { brandAssetUrl, brandLogo } from '@/lib/brand/assets'
import { Link, usePathname } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import BrandLogo from '@/components/brand/BrandLogo'

export default function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const homeTarget = buildAuthenticatedHomeTarget()
  const isAuthed = status === 'authenticated' && !!session

  const isActive = (target: string) => {
    if (target === '/home' || target === homeTarget.pathname) {
      return pathname === '/home' || pathname === homeTarget.pathname
    }
    if (target === '/workspace') {
      return pathname === '/workspace'
    }
    if (target === '/workspace/asset-hub') {
      return pathname === '/workspace/asset-hub' || pathname.startsWith('/workspace/asset-hub/')
    }
    if (target === '/logs') {
      return pathname === '/logs' || pathname.startsWith('/logs/')
    }
    if (target === '/profile') {
      return pathname === '/profile' || pathname.startsWith('/profile/')
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
            href={homeTarget}
            className="theater-rail__link"
            data-active={isActive('/home') ? 'true' : 'false'}
            aria-label={t('railHome')}
          >
            <BrandIcon name="home" size={22} />
            <span className="rail-tip" role="tooltip">{t('railHome')}</span>
          </Link>
          <Link
            href={{ pathname: '/workspace' }}
            className="theater-rail__link"
            data-active={isActive('/workspace') ? 'true' : 'false'}
            aria-label={t('railProjects')}
          >
            <BrandIcon name="project" size={22} />
            <span className="rail-tip" role="tooltip">{t('railProjects')}</span>
          </Link>
          <Link
            href={{ pathname: '/workspace/asset-hub' }}
            className="theater-rail__link"
            data-active={isActive('/workspace/asset-hub') ? 'true' : 'false'}
            aria-label={t('railAssets')}
          >
            <BrandIcon name="assets" size={22} />
            <span className="rail-tip" role="tooltip">{t('railAssets')}</span>
          </Link>
          <Link
            href={{ pathname: '/logs' }}
            className="theater-rail__link"
            data-active={isActive('/logs') ? 'true' : 'false'}
            aria-label={t('railLogs')}
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
          >
            <BrandIcon name="settings" size={22} />
            <span className="rail-tip" role="tooltip">{t('railSettings')}</span>
          </Link>
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
              {status === 'loading' ? (
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 rounded bg-[var(--glass-bg-muted)] animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-[var(--glass-bg-muted)] animate-pulse" />
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </nav>
      ) : null}
    </>
  )
}
