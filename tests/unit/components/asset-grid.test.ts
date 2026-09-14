import * as React from 'react'
import { createElement } from 'react'
import type { ComponentProps, ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'
import { AssetGrid } from '@/app/[locale]/workspace/asset-hub/components/AssetGrid'

vi.mock('@/app/[locale]/workspace/asset-hub/components/CharacterCard', () => ({
  CharacterCard: () => null,
}))

vi.mock('@/app/[locale]/workspace/asset-hub/components/LocationCard', () => ({
  LocationCard: () => null,
}))

vi.mock('@/app/[locale]/workspace/asset-hub/components/VoiceCard', () => ({
  VoiceCard: () => null,
}))

vi.mock('@/components/task/TaskStatusInline', () => ({
  default: () => null,
}))

const messages = {
  assetHub: {
    allAssets: '全部资产',
    characters: '角色',
    locations: '场景',
    props: '道具',
    voices: '音色',
    soundEffects: '音效',
    addAsset: '新建资产',
    addCharacter: '新建角色',
    addLocation: '新建场景',
    addProp: '新建道具',
    addVoice: '新建音色',
    emptyState: '您还没有任何资产',
    emptyStateHint: '创建角色、场景或音色后，可在各项目中复用。',
    filteredEmptyHint: '点击新建资产添加资产',
    sfxEmptyTitle: '音效库即将上线',
    sfxEmptyHint: '音效资产管理正在准备中，敬请期待。',
    pagination: {
      previous: '上一页',
      next: '下一页',
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

const baseHandlers = {
  onAddCharacter: () => undefined,
  onAddLocation: () => undefined,
  onAddProp: () => undefined,
  onAddVoice: () => undefined,
}

describe('AssetGrid', () => {
  it('空状态下展示空态文案与新建资产按钮', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderWithIntl(
      createElement(AssetGrid, {
        assets: [],
        loading: false,
        filter: 'all',
        ...baseHandlers,
      }),
    )

    expect(html).toContain('您还没有任何资产')
    expect(html).toContain('>新建资产<')
  })

  it('当前筛选分类没有资产时显示添加提示文案', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderWithIntl(
      createElement(AssetGrid, {
        assets: [
          {
            id: 'character-1',
            kind: 'character',
            family: 'visual',
            scope: 'project',
            name: '角色A',
            folderId: null,
            capabilities: {
              canGenerate: true,
              canSelectRender: false,
              canRevertRender: false,
              canModifyRender: false,
              canUploadRender: false,
              canBindVoice: false,
              canCopyFromGlobal: false,
            },
            taskRefs: [],
            taskState: { isRunning: false, lastError: null },
            variants: [],
            introduction: null,
            profileData: null,
            profileConfirmed: null,
            profileTaskRefs: [],
            profileTaskState: { isRunning: false, lastError: null },
            voice: {
              voiceType: null,
              voiceId: null,
              customVoiceUrl: null,
              media: null,
            },
          },
        ],
        loading: false,
        filter: 'location',
        ...baseHandlers,
      }),
    )

    expect(html).toContain('点击新建资产添加资产')
  })

  it('音效筛选展示即将上线提示', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderWithIntl(
      createElement(AssetGrid, {
        assets: [],
        loading: false,
        filter: 'sfx',
        ...baseHandlers,
      }),
    )

    expect(html).toContain('音效库即将上线')
  })
})
