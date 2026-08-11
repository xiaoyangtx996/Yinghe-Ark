'use client'

import { useTranslations } from 'next-intl'
import GlassModalShell from '@/components/ui/primitives/GlassModalShell'
import { APP_VERSION } from '@/lib/app-meta'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const t = useTranslations('common')

  return (
    <GlassModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title={t('about.title')}
      showCloseButton={false}
    >
      <div className="flex flex-col items-center px-2 py-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[16px] bg-[var(--film-gold)] font-display text-2xl font-bold text-[var(--glass-text-on-accent)]">
          W
        </div>
        <h3 className="font-display text-2xl font-semibold text-[var(--glass-text-primary)]">
          {t('appName')}
        </h3>
        <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">
          {t('betaVersion', { version: APP_VERSION })}
        </p>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[var(--glass-text-tertiary)]">
          {t('about.description')}
        </p>
      </div>
    </GlassModalShell>
  )
}
