import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { AUTHENTICATED_HOME_PATHNAME } from '@/lib/home/default-route'
import { locales, type Locale } from '@/i18n/routing'
import LandingPageClient from './LandingPageClient'

type SupportedLocale = (typeof locales)[number]

function isSupportedLocale(value: string): value is SupportedLocale {
  return (locales as readonly string[]).includes(value)
}

/**
 * Marketing root (`/{locale}`).
 * Logged-in users are redirected server-side to `/workspace` so QA/product never
 * confuses the marketing landing with the creator shell.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : locales[0]

  const session = await getServerSession(authOptions)
  if (session) {
    redirect({ href: AUTHENTICATED_HOME_PATHNAME, locale })
  }

  return <LandingPageClient />
}
