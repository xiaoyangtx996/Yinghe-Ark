'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import { optScreens, type OptScreenId } from './data'
import { GalleryScreen, OptScreenBody } from './screens'

export default function OptPreviewPage() {
  const [screen, setScreen] = useState<OptScreenId>('gallery')
  const meta = optScreens.find((s) => s.id === screen) ?? optScreens[0]

  return (
    <div className="glass-page min-h-dvh">
      <Navbar />
      <SecondarySidebar
        title="优化预览"
        description="Film DI 现有样式 · 仅原型"
        items={optScreens.map((s) => ({
          id: s.id,
          label: s.title,
          icon: s.icon,
          active: screen === s.id,
          onClick: () => setScreen(s.id),
        }))}
      />

      <main className="mx-auto flex h-dvh max-w-[1440px] flex-col px-4 pb-4 pt-4 sm:px-6">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-header__title">{meta.title}</h1>
            <p className="admin-page-header__desc">
              {meta.desc}
              <span className="ml-2 text-[var(--glass-text-tertiary)]">· {meta.source}</span>
            </p>
          </div>
          <div className="admin-page-header__actions">
            <span className="glass-chip glass-chip-neutral text-[10px]">dev / mock</span>
            {meta.priority !== undefined && meta.id !== 'gallery' ? (
              <span
                className={`glass-chip text-[10px] ${
                  meta.priority === '高'
                    ? 'glass-chip-warning'
                    : meta.priority === '中'
                      ? 'glass-chip-info'
                      : 'glass-chip-neutral'
                }`}
              >
                {meta.priority}优
              </span>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {screen === 'gallery' ? (
            <GalleryScreen onNavigate={setScreen} />
          ) : (
            <OptScreenBody screen={screen} />
          )}
        </div>
      </main>
    </div>
  )
}
