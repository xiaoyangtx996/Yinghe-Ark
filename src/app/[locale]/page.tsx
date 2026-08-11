'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { Link } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

export default function Home() {
  const t = useTranslations('landing')
  const { data: session, status } = useSession()
  const router = useRouter()

  // 已登录用户自动跳转到 home
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(buildAuthenticatedHomeTarget())
    }
  }, [status, router])

  // session 加载中或已登录（即将跳转），不渲染落地页，避免闪烁
  if (status !== 'unauthenticated') {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo-small.png?v=1"
            alt="waoowaoo"
            width={80}
            height={80}
            className="animate-pulse"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="glass-page min-h-dvh font-sans selection:bg-[var(--glass-tone-info-bg)]">
      <Navbar />

      <main className="relative z-10 pb-8">
        <section className="mx-4 mt-5 overflow-hidden rounded-[var(--glass-radius-panel)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] sm:mx-6 lg:mx-8">
          <div className="grid min-h-[460px] lg:grid-cols-[1.1fr_0.9fr]">
            <div
              className="border-b border-[var(--glass-stroke-base)] p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-12"
              style={{
                background:
                  'radial-gradient(ellipse at 0% 0%, rgba(224,163,106,.12), transparent 50%), var(--glass-bg-surface)',
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--film-gold)]">
                Open Source Film Suite
              </div>
              <h1 className="font-display mt-3 max-w-[12ch] text-[clamp(36px,4.5vw,52px)] font-semibold leading-[1.08] text-[var(--glass-text-primary)] text-balance">
                {t('title')}
                <span className="mt-2 block text-[var(--film-gold)]">{t('subtitle')}</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--glass-text-secondary)]">
                {t('features.subtitle')}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={{ pathname: '/auth/signup' }}
                  className="glass-btn-base glass-btn-primary px-5 py-2.5 text-sm"
                >
                  {t('getStarted')}
                </Link>
                <Link
                  href={{ pathname: '/auth/signin' }}
                  className="glass-btn-base glass-btn-ghost border border-[var(--glass-stroke-base)] px-5 py-2.5 text-sm"
                >
                  {t('enterWorkspace')}
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-[var(--glass-bg-muted)] p-6">
              <div className="grid grid-cols-4 gap-2">
                {[
                  t('features.character.title'),
                  t('features.world.title'),
                  t('features.storyboard.title'),
                  '成片',
                ].map((label, i) => (
                  <div
                    key={label}
                    className="flex aspect-[3/4] items-end rounded-[10px] border border-[var(--glass-stroke-base)] p-2 text-[11px] text-[var(--glass-text-secondary)]"
                    style={{
                      background:
                        i === 0
                          ? 'linear-gradient(160deg, #3a2e24, #15120f)'
                          : i === 1
                            ? 'linear-gradient(160deg, #2f3a32, #15120f)'
                            : i === 2
                              ? 'linear-gradient(160deg, #2a3340, #15120f)'
                              : 'linear-gradient(160deg, #403028, #15120f)',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <span className="glass-chip glass-chip-neutral">故事</span>
                <span className="glass-chip glass-chip-neutral">剧本</span>
                <span className="glass-chip glass-chip-neutral">分镜</span>
                <span className="glass-chip glass-chip-info">成片 · 配音</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-4 mt-5 overflow-hidden rounded-xl border border-[var(--glass-stroke-base)] sm:mx-6 lg:mx-8">
          <div className="grid grid-cols-1 divide-y divide-[var(--glass-stroke-base)] bg-[var(--glass-stroke-base)] sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
            <article className="bg-[var(--glass-bg-canvas)] p-4 sm:p-5">
              <h3 className="mb-1.5 text-[13px] font-semibold">{t('features.character.title')}</h3>
              <p className="text-xs text-[var(--glass-text-secondary)]">{t('features.character.description')}</p>
            </article>
            <article className="bg-[var(--glass-bg-canvas)] p-4 sm:p-5">
              <h3 className="mb-1.5 text-[13px] font-semibold">{t('features.world.title')}</h3>
              <p className="text-xs text-[var(--glass-text-secondary)]">{t('features.world.description')}</p>
            </article>
            <article className="bg-[var(--glass-bg-canvas)] p-4 sm:p-5">
              <h3 className="mb-1.5 text-[13px] font-semibold">{t('features.storyboard.title')}</h3>
              <p className="text-xs text-[var(--glass-text-secondary)]">{t('features.storyboard.description')}</p>
            </article>
            <article className="bg-[var(--glass-bg-canvas)] p-4 sm:p-5">
              <h3 className="mb-1.5 text-[13px] font-semibold">{t('features.title')}</h3>
              <p className="text-xs text-[var(--glass-text-secondary)]">{t('features.subtitle')}</p>
            </article>
          </div>
        </section>

        <footer className="mt-8 px-6 text-center text-xs text-[var(--glass-text-tertiary)]">
          {t('footer.copyright')}
        </footer>
      </main>
    </div>
  )
}
