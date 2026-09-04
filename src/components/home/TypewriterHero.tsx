'use client'

/**
 * TypewriterHero — 品牌标题 + 一句支持文案（Film 向，无终端梗）
 */
interface TypewriterHeroProps {
  title: string
  subtitle: string
}

export default function TypewriterHero({ title, subtitle }: TypewriterHeroProps) {
  return (
    <div className="mb-3 text-left">
      <style>{`
        @keyframes twh-rise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <h1
        className="font-display mb-2 text-left text-[clamp(28px,4vw,34px)] font-semibold tracking-tight text-[var(--glass-text-primary)]"
        style={{ animation: 'twh-rise 0.55s var(--glass-motion-easing) both' }}
      >
        {title}
      </h1>

      <p
        className="h-auto min-h-6 text-left text-[length:var(--glass-font-size-body)] font-medium leading-6 text-[var(--glass-text-primary)]"
        style={{
          opacity: 0.78,
          animation: 'twh-rise 0.55s var(--glass-motion-easing) 0.08s both',
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}
