'use client'

import { useTranslations } from 'next-intl'

export default function StepParse({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('smartImport')

  return (
    <div className={compact ? 'text-center' : 'flex min-h-[calc(100vh-200px)] items-center justify-center p-8'}>
      <div className="text-center">
        <div className="mb-8 flex justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 w-3 rounded-full bg-[var(--glass-accent-from)]"
              style={{
                animation: 'smart-import-wave 1s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        <h2 className="mb-2 text-xl font-medium text-[var(--glass-text-primary)]">{t('analyzing.title')}</h2>
        <p className="text-[var(--glass-text-secondary)]">{t('analyzing.description')}</p>
        <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">{t('analyzing.autoSave')}</p>
      </div>

      <style jsx>{`
        @keyframes smart-import-wave {
          0%,
          100% {
            transform: scaleY(0.4);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  )
}
