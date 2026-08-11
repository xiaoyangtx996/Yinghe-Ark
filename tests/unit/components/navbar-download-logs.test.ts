import * as React from 'react'
import { createElement } from 'react'
import type { ComponentProps, ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'
import Navbar from '@/components/Navbar'

const useSessionMock = vi.fn()

vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string } & Record<string, unknown>) => createElement('img', { alt, ...props }),
}))

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => createElement('div', null, 'LanguageSwitcher'),
}))

vi.mock('@/components/AboutModal', () => ({
  default: () => null,
}))

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/home',
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string }
    children: React.ReactNode
  } & Record<string, unknown>) => {
    const resolvedHref = typeof href === 'string' ? href : href.pathname
    return createElement('a', { href: resolvedHref, ...props }, children)
  },
}))

const messages = {
  nav: {
    workspace: '工作区',
    assetHub: '资产中心',
    profile: '设置中心',
    downloadLogs: '下载日志',
    signin: '登录',
    signup: '注册',
    railHome: '创作',
    railProjects: '项目',
    railAssets: '资产',
    railLogs: '日志',
    railSettings: '设置',
  },
  common: {
    appName: 'waoowaoo',
    betaVersion: 'Beta v{version}',
    about: {
      title: '关于',
      open: '关于',
      description: 'about',
    },
  },
} as const

const renderWithIntl = (node: ReactElement) => {
  const providerProps: ComponentProps<typeof NextIntlClientProvider> = {
    locale: 'zh',
    messages: messages as unknown as AbstractIntlMessages,
    timeZone: 'Asia/Shanghai',
    children: node,
  }

  return renderToStaticMarkup(
    createElement(NextIntlClientProvider, providerProps),
  )
}

describe('Navbar authenticated chrome', () => {
  beforeEach(() => {
    useSessionMock.mockReset()
  })

  it('renders theater rail with logs entry and without top-bar download logs for signed-in users', () => {
    Reflect.set(globalThis, 'React', React)
    useSessionMock.mockReturnValue({
      data: { user: { name: 'Earth' } },
      status: 'authenticated',
    })

    const html = renderWithIntl(createElement(Navbar))

    expect(html).toContain('aria-label="日志"')
    expect(html).toContain('href="/logs"')
    expect(html).toContain('href="/home"')
    expect(html).not.toContain('下载日志')
    expect(html).not.toContain('/api/admin/download-logs')
  })

  it('does not render theater rail for signed-out users', () => {
    Reflect.set(globalThis, 'React', React)
    useSessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const html = renderWithIntl(createElement(Navbar))

    expect(html).not.toContain('data-theater-rail')
    expect(html).not.toContain('/api/admin/download-logs')
    expect(html).toContain('登录')
  })
})
