'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

type AppBootScreenProps = {
  /** Override default common.loading label */
  label?: string
}

const PIPELINE_FRAMES = 5
/** Bar heights as fraction of full strip — wave pattern rotated each tick */
const WAVE = [0.32, 0.55, 1, 0.55, 0.32] as const
const TICK_MS = 180

/**
 * Full-viewport boot / session loading surface.
 * Intentionally renders NO navbar / theater rail / brand logo.
 * Frame motion is JS-driven so loading reads clearly even if CSS keyframes fail.
 */
export default function AppBootScreen({ label }: AppBootScreenProps) {
  const tc = useTranslations('common')
  const title = label ?? tc('loading')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((value) => value + 1)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className="app-boot-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="app-boot-screen__atmosphere" aria-hidden>
        <span className="app-boot-screen__glow app-boot-screen__glow--gold" />
        <span className="app-boot-screen__glow app-boot-screen__glow--teal" />
        <span className="app-boot-screen__grain" />
      </div>

      <div className="app-boot-screen__body">
        <div className="app-boot-screen__strip" aria-hidden>
          {Array.from({ length: PIPELINE_FRAMES }, (_, index) => {
            // Subtract tick so the peak sweeps left → right
            const level =
              WAVE[(index - (tick % PIPELINE_FRAMES) + PIPELINE_FRAMES) % PIPELINE_FRAMES] ?? 0.32
            const isPeak = level >= 0.95
            return (
              <span
                key={index}
                className={
                  isPeak
                    ? 'app-boot-screen__frame app-boot-screen__frame--peak'
                    : 'app-boot-screen__frame'
                }
                style={{ height: `${Math.round(level * 68)}px` }}
              />
            )
          })}
        </div>

        <p className="app-boot-screen__title">{title}</p>
      </div>
    </div>
  )
}
