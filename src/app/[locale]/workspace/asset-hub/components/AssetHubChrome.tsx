'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon, type AppIconName } from '@/components/ui/icons'
import type { AssetSummary } from '@/lib/assets/contracts'
import { useAssetKindCounts, type AssetHubFilter } from './AssetGrid'
import type { GlobalFolder } from '@/lib/query/hooks'

function kindLabel(t: (key: string) => string, kind: AssetSummary['kind']) {
  switch (kind) {
    case 'character':
      return t('characters')
    case 'location':
      return t('locations')
    case 'prop':
      return t('props')
    case 'voice':
      return t('voices')
    default:
      return kind
  }
}

function thumbUrl(asset: AssetSummary): string | null {
  if (asset.kind === 'voice') return null
  if ('variants' in asset) {
    const render = asset.variants[0]?.renders.find((item) => item.isSelected)
      ?? asset.variants[0]?.renders[0]
    return render?.imageUrl ?? null
  }
  return null
}

type BoardColumn = {
  key: AssetHubFilter
  label: string
  count: number
  icon: AppIconName
  items: AssetSummary[]
  folderCount: number
  soon?: boolean
}

/** 「全部资产」看板：按分类列展示库存与近况，不是跳转快捷入口墙 */
export function AssetHubDashboard({
  assets,
  folders,
  onOpenCategory,
}: {
  assets: AssetSummary[]
  folders: GlobalFolder[]
  onOpenCategory: (filter: AssetHubFilter) => void
}) {
  const t = useTranslations('assetHub')
  const counts = useAssetKindCounts(assets)

  const columns = useMemo((): BoardColumn[] => {
    const byKind = {
      character: assets.filter((asset) => asset.kind === 'character'),
      location: assets.filter((asset) => asset.kind === 'location' || asset.kind === 'prop'),
      voice: assets.filter((asset) => asset.kind === 'voice'),
    }
    const folderOf = (kind: string) =>
      folders.filter((folder) => folder.kind === kind || folder.kind == null).length

    return [
      {
        key: 'character',
        label: t('characters'),
        count: counts.character,
        icon: 'user',
        items: byKind.character.slice(0, 6),
        folderCount: folderOf('character'),
      },
      {
        key: 'location',
        label: t('locations'),
        count: counts.location + counts.prop,
        icon: 'image',
        items: byKind.location.slice(0, 6),
        folderCount: folderOf('location'),
      },
      {
        key: 'voice',
        label: t('voices'),
        count: counts.voice,
        icon: 'mic',
        items: byKind.voice.slice(0, 6),
        folderCount: folderOf('voice'),
      },
      {
        key: 'sfx',
        label: t('soundEffects'),
        count: 0,
        icon: 'volumeOff',
        items: [],
        folderCount: folderOf('sfx'),
        soon: true,
      },
    ]
  }, [assets, folders, counts, t])

  const recent = useMemo(() => [...assets].slice(0, 10), [assets])

  return (
    <div className="space-y-5 pb-6">
      <section className="glass-surface px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold tracking-[0.02em] text-[var(--glass-text-secondary)]">
              {t('boardTitle')}
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--glass-text-tertiary)]">
              {t('dashboardOverviewHint', { folders: folders.length, assets: counts.all })}
            </p>
          </div>
          <p className="text-[12px] text-[var(--glass-text-tertiary)]">{t('boardHint')}</p>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <section
            key={column.key}
            className="glass-surface flex min-h-[320px] flex-col overflow-hidden"
          >
            <header className="flex items-center gap-2 border-b border-[var(--glass-stroke-base)] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--glass-bg-muted)] text-[var(--film-gold-2)]">
                <AppIcon name={column.icon} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-[13px] font-semibold text-[var(--glass-text-primary)]">
                    {column.label}
                  </h3>
                  {column.soon ? (
                    <span className="rounded bg-[var(--glass-bg-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--glass-text-tertiary)]">
                      {t('comingSoon')}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-[var(--glass-text-tertiary)]">
                  {t('boardColumnMeta', { assets: column.count, folders: column.folderCount })}
                </p>
              </div>
              <span className="tabular-nums text-[16px] font-semibold text-[var(--glass-text-primary)]">
                {column.count}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2.5">
              {column.soon ? (
                <p className="m-auto max-w-[12rem] text-center text-[12px] leading-relaxed text-[var(--glass-text-tertiary)]">
                  {t('sfxEmptyHint')}
                </p>
              ) : column.items.length === 0 ? (
                <p className="m-auto max-w-[12rem] text-center text-[12px] leading-relaxed text-[var(--glass-text-tertiary)]">
                  {t('boardColumnEmpty')}
                </p>
              ) : (
                column.items.map((asset) => {
                  const thumb = thumbUrl(asset)
                  return (
                    <div
                      key={`${asset.kind}-${asset.id}`}
                      className="flex items-center gap-2 rounded-[var(--glass-radius-sm)] border border-[var(--glass-stroke-base)] bg-[color-mix(in_srgb,var(--glass-bg-muted)_45%,transparent)] px-2 py-1.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--glass-bg-muted)]">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <AppIcon name={column.icon} className="h-3.5 w-3.5 text-[var(--glass-text-tertiary)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium text-[var(--glass-text-primary)]">
                          {asset.name}
                        </div>
                        <div className="truncate text-[10.5px] text-[var(--glass-text-tertiary)]">
                          {kindLabel(t, asset.kind)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <footer className="border-t border-[var(--glass-stroke-base)] px-2.5 py-2">
              <button
                type="button"
                onClick={() => onOpenCategory(column.key)}
                className="w-full rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-[var(--film-gold-2)] transition-colors hover:bg-[var(--glass-bg-muted)]"
              >
                {t('boardOpenLibrary')}
              </button>
            </footer>
          </section>
        ))}
      </div>

      <section className="glass-surface p-4">
        <h2 className="text-[13px] font-semibold tracking-[0.02em] text-[var(--glass-text-secondary)]">
          {t('recentTitle')}
        </h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-[var(--glass-text-tertiary)]">{t('recentEmpty')}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((asset) => {
              const thumb = thumbUrl(asset)
              return (
                <li
                  key={`recent-${asset.kind}-${asset.id}`}
                  className="flex items-center gap-2.5 rounded-[var(--glass-radius-sm)] border border-[var(--glass-stroke-base)] px-2.5 py-2"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-bg-muted)]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <AppIcon name="mic" className="h-3.5 w-3.5 text-[var(--glass-text-tertiary)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--glass-text-primary)]">
                      {asset.name}
                    </div>
                    <div className="truncate text-[11px] text-[var(--glass-text-tertiary)]">
                      {kindLabel(t, asset.kind)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
