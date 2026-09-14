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
  it('defaults to inline document-flow placement (no fixed overlay)', () => {
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

    expect(html).toContain('data-placement="inline"')
    expect(html).not.toContain('fixed top-[4.75rem]')
    expect(html).not.toContain('z-50 animate-fadeInDown')
    expect(html).not.toContain('z-[60]')
  })

  it('supports rail placement for vertical stage list', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderToStaticMarkup(
      createElement(CapsuleNav, {
        placement: 'rail',
        items: [
          { id: 'config', icon: 'sparkles', label: '配置', status: 'active' as const },
        ],
        activeId: 'config',
        onItemClick: () => undefined,
        projectId: 'project-1',
      }),
    )

    expect(html).toContain('data-placement="rail"')
    expect(html).toContain('film-stages--rail')
    expect(html).not.toContain('fixed top-[4.75rem]')
  })

  it('keeps fixed workspace navigation below modal overlays when placement=fixed', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderToStaticMarkup(
      createElement('div', null,
        createElement(CapsuleNav, {
          placement: 'fixed',
          items: [
            { id: 'config', icon: 'sparkles', label: '配置', status: 'active' as const },
          ],
          activeId: 'config',
          onItemClick: () => undefined,
          projectId: 'project-1',
        }),
        createElement(EpisodeSelector, {
          placement: 'fixed',
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
