'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

function initialsFromName(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || '?').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

/**
 * Theater-rail avatar — navigates straight into the account secondary sidebar.
 */
export default function RailUserMenu() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tp = useTranslations('profile')

  const user = session?.user
  const image = user?.image || null
  const initials = initialsFromName(user?.name, user?.email)
  const accountActive = pathname === '/account' || pathname.startsWith('/account/')

  return (
    <Link
      href={{ pathname: '/account' }}
      className="theater-rail__avatar"
      aria-label={t('railAccount')}
      data-active={accountActive ? 'true' : 'false'}
    >
      {image ? (
        // External OAuth avatars vary by provider host; avoid next/image domain allowlist friction.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="theater-rail__avatar-fallback" aria-hidden>
          {initials}
        </span>
      )}
      <span className="rail-tip" role="tooltip">{tp('personalAccount')}</span>
    </Link>
  )
}
