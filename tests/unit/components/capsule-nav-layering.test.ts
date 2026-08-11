import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CapsuleNav, EpisodeSelector } from '@/components/ui/CapsuleNav'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/components/ui/icons', () => ({
  AppIcon: ({ name, className }: { name: string; className?: string }) =>
    createElement('span', { 'data-icon': name, className }),
}))

describe('CapsuleNav layering', () => {
  it('keeps fixed workspace navigation below modal overlays', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderToStaticMarkup(
      createElement('div', null,
        createElement(CapsuleNav, {
          items: [
            { id: 'config', icon: 'sparkles', label: '配置', status: 'active' as const },
          ],
          activeId: 'config',
          onItemClick: () => undefined,
          projectId: 'project-1',
        }),
        createElement(EpisodeSelector, {
          episodes: [
            { id: 'episode-1', title: '剧集 1' },
          ],
          currentId: 'episode-1',
          onSelect: () => undefined,
          projectName: '项目 A',
        }),
      ),
    )

    expect(html).toContain('fixed top-[4.75rem] left-1/2')
    expect(html).toContain('-translate-x-1/2')
    expect(html).toContain('z-40')
    expect(html).toContain('left-[calc(var(--app-rail-width)+1.5rem)]')
    expect(html).not.toContain('z-50 animate-fadeInDown')
    expect(html).not.toContain('z-[60]')
  })
})
