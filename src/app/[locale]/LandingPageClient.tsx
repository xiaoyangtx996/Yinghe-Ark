'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { Link } from '@/i18n/navigation'
import {
  brandAssetTypeIcon,
  brandAssetUrl,
  brandPipeIcon,
  type BrandAssetTypeIconName,
} from '@/lib/brand/assets'

type PipelineStage = 'story' | 'script' | 'storyboard' | 'output'

const STAGES: PipelineStage[] = ['story', 'script', 'storyboard', 'output']

const STAGE_PIPE: Record<PipelineStage, keyof typeof brandPipeIcon> = {
  story: 'story',
  script: 'script',
  storyboard: 'storyboard',
  output: 'video',
}

const STAGE_TILE_ICONS: Record<PipelineStage, BrandAssetTypeIconName[]> = {
  story: ['character', 'character', 'prop'],
  script: ['scene', 'prop', 'scene'],
  storyboard: ['scene', 'character', 'scene'],
  output: ['voice', 'scene', 'prop'],
}

const WORKFLOW_KEYS = ['analyze', 'assets', 'board', 'produce'] as const
const WORKFLOW_ICONS: Record<(typeof WORKFLOW_KEYS)[number], string> = {
  analyze: brandPipeIcon.script,
  assets: brandAssetTypeIcon.character,
  board: brandPipeIcon.storyboard,
  produce: brandPipeIcon.video,
}

const FEATURE_KEYS = ['script', 'character', 'world', 'storyboard', 'voice', 'assets'] as const
const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], string> = {
  script: brandPipeIcon.script,
  character: brandAssetTypeIcon.character,
  world: brandAssetTypeIcon.scene,
  storyboard: brandPipeIcon.storyboard,
  voice: brandAssetTypeIcon.voice,
  assets: brandAssetTypeIcon.prop,
}

const USE_CASE_KEYS = ['shortDrama', 'comic', 'team'] as const

/**
 * Marketing landing — Apple layout principles (display type, restraint, materials)
 * with Film DI / glass system color tokens only.
 */
export default function LandingPageClient() {
  const t = useTranslations('landing')
  const [stage, setStage] = useState<PipelineStage>('story')
  const tileLabels = t.raw(`pipeline.stages.${stage}.tiles`) as string[]

  return (
    <div className="landing-apple glass-page min-h-dvh selection:bg-[var(--glass-tone-info-bg)]">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="landing-apple__hero">
          <div className="landing-apple__shell landing-apple__hero-grid">
            <div className="landing-apple__hero-copy">
              <p className="landing-apple__eyebrow">{t('hero.eyebrow')}</p>
              <h1 className="landing-apple__display">{t('hero.headline')}</h1>
              <p className="landing-apple__lede">{t('hero.support')}</p>
              <div className="landing-apple__cta-row">
                <Link
                  href={{ pathname: '/auth/signup' }}
                  className="glass-btn-base glass-btn-primary landing-apple__btn"
                >
                  {t('getStarted')}
                </Link>
                <Link
                  href={{ pathname: '/auth/signin' }}
                  className="landing-apple__text-link"
                >
                  {t('enterWorkspace')}
                </Link>
              </div>
            </div>

            <div className="landing-apple__device" aria-label={t('pipeline.previewTitle')}>
              <div className="landing-apple__device-chrome">
                <span className="landing-apple__device-title">{t('pipeline.previewTitle')}</span>
                <span className="landing-apple__device-stage">{t(`pipeline.stages.${stage}.label`)}</span>
              </div>

              <div className="landing-apple__segment" role="tablist" aria-label={t('workflow.title')}>
                {STAGES.map((id) => {
                  const active = stage === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`landing-apple__segment-item${active ? ' is-active' : ''}`}
                      onClick={() => setStage(id)}
                    >
                      {t(`pipeline.stages.${id}.label`)}
                    </button>
                  )
                })}
              </div>

              <div key={stage} className="landing-apple__stage-panel">
                <div className="landing-apple__stage-head">
                  <Image
                    src={brandAssetUrl(brandPipeIcon[STAGE_PIPE[stage]])}
                    alt=""
                    width={40}
                    height={40}
                    className="landing-apple__stage-icon"
                    priority
                  />
                  <div>
                    <p className="landing-apple__stage-hint">{t(`pipeline.stages.${stage}.hint`)}</p>
                    <p className="landing-apple__stage-body">{t(`pipeline.stages.${stage}.body`)}</p>
                  </div>
                </div>
                <div className="landing-apple__stage-tiles">
                  {STAGE_TILE_ICONS[stage].map((iconName, i) => (
                    <div key={`${stage}-${i}`} className="landing-apple__tile">
                      <Image
                        src={brandAssetUrl(brandAssetTypeIcon[iconName])}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                      <span>{tileLabels[i] ?? ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="landing-apple__band">
          <div className="landing-apple__shell">
            <header className="landing-apple__section-head">
              <h2 className="landing-apple__h2">{t('workflow.title')}</h2>
              <p className="landing-apple__section-desc">{t('workflow.subtitle')}</p>
            </header>
            <ol className="landing-apple__steps">
              {WORKFLOW_KEYS.map((key, index) => (
                <li key={key} className="landing-apple__step">
                  <span className="landing-apple__step-n">{String(index + 1).padStart(2, '0')}</span>
                  <Image
                    src={brandAssetUrl(WORKFLOW_ICONS[key])}
                    alt=""
                    width={36}
                    height={36}
                    className="landing-apple__step-icon"
                  />
                  <h3 className="landing-apple__step-title">{t(`workflow.steps.${key}.title`)}</h3>
                  <p className="landing-apple__step-desc">{t(`workflow.steps.${key}.description`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Capabilities */}
        <section className="landing-apple__band landing-apple__band--muted">
          <div className="landing-apple__shell">
            <header className="landing-apple__section-head">
              <h2 className="landing-apple__h2">{t('features.title')}</h2>
              <p className="landing-apple__section-desc">{t('features.subtitle')}</p>
            </header>
            <div className="landing-apple__features">
              {FEATURE_KEYS.map((key) => (
                <article key={key} className="landing-apple__feature">
                  <div className="landing-apple__feature-icon">
                    <Image
                      src={brandAssetUrl(FEATURE_ICONS[key])}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <h3 className="landing-apple__feature-title">{t(`features.${key}.title`)}</h3>
                  <p className="landing-apple__feature-desc">{t(`features.${key}.description`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="landing-apple__band">
          <div className="landing-apple__shell">
            <header className="landing-apple__section-head landing-apple__section-head--center">
              <h2 className="landing-apple__h2">{t('useCases.title')}</h2>
              <p className="landing-apple__section-desc">{t('useCases.subtitle')}</p>
            </header>
            <div className="landing-apple__usecases">
              {USE_CASE_KEYS.map((key) => (
                <article key={key} className="landing-apple__usecase">
                  <h3 className="landing-apple__usecase-title">{t(`useCases.items.${key}.title`)}</h3>
                  <p className="landing-apple__usecase-desc">{t(`useCases.items.${key}.description`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="landing-apple__band landing-apple__closing">
          <div className="landing-apple__shell landing-apple__closing-inner">
            <h2 className="landing-apple__display landing-apple__display--sm">{t('cta.title')}</h2>
            <p className="landing-apple__lede landing-apple__lede--center">{t('cta.subtitle')}</p>
            <div className="landing-apple__cta-row landing-apple__cta-row--center">
              <Link
                href={{ pathname: '/auth/signup' }}
                className="glass-btn-base glass-btn-primary landing-apple__btn"
              >
                {t('cta.primary')}
              </Link>
              <Link href={{ pathname: '/auth/signin' }} className="landing-apple__text-link">
                {t('cta.secondary')}
              </Link>
            </div>
          </div>
        </section>

        <footer className="landing-apple__footer">{t('footer.copyright')}</footer>
      </main>
    </div>
  )
}
