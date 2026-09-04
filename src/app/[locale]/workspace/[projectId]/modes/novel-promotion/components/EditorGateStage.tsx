'use client'

import { AppIcon } from '@/components/ui/icons'
import { useTranslations } from 'next-intl'

interface EditorGateStageProps {
  onGoVideos: () => void
}

export default function EditorGateStage({ onGoVideos }: EditorGateStageProps) {
  const t = useTranslations('novelPromotion.editorGate')

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--glass-tone-info-bg)]">
        <AppIcon name="film" className="h-7 w-7 text-[var(--film-gold)]" />
      </div>
      <h2 className="font-display text-xl font-medium text-[var(--glass-text-primary)]">
        {t('title')}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--glass-text-secondary)]">
        {t('description')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onGoVideos}
          className="glass-btn-base glass-btn-primary px-4 py-2 text-sm font-semibold"
        >
          {t('goVideos')}
        </button>
      </div>
      <p className="mt-4 text-xs text-[var(--glass-text-tertiary)]">{t('hint')}</p>
    </div>
  )
}
