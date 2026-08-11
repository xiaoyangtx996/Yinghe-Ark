'use client'

/**
 * TypewriterHero — 标题 + 终端打字机副标题
 * 对焦动画保留，取景器四角线移至页面级包裹
 */
import { useState, useEffect, useRef } from 'react'

const TYPE_SPEED = 55
const DELETE_SPEED = 20
const PAUSE_AFTER_TYPE = 3200
const PAUSE_AFTER_DELETE = 500

interface TypewriterHeroProps {
  title: string
  subtitle: string
}

export default function TypewriterHero({ title, subtitle }: TypewriterHeroProps) {
  const [text, setText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const prevLenRef = useRef(0)

  useEffect(() => {
    prevLenRef.current = text.length
  })

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isDeleting && text.length === subtitle.length) {
      timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE)
    } else if (isDeleting && text.length === 0) {
      timeout = setTimeout(() => setIsDeleting(false), PAUSE_AFTER_DELETE)
    } else {
      timeout = setTimeout(
        () => setText(subtitle.slice(0, text.length + (isDeleting ? -1 : 1))),
        isDeleting ? DELETE_SPEED : TYPE_SPEED
      )
    }
    return () => clearTimeout(timeout)
  }, [text, isDeleting, subtitle])

  const isNewChar = (i: number) =>
    !isDeleting && i === text.length - 1 && text.length > prevLenRef.current

  return (
    <div className="mb-3 text-left">
      <style>{`
        @keyframes twh-focus-pull {
          0%, 70%, 100% { filter: blur(0px); opacity: 1; }
          75% { filter: blur(3px); opacity: 0.85; }
          80% { filter: blur(1.5px); opacity: 0.9; }
          85% { filter: blur(0.5px); opacity: 0.95; }
          88% { filter: blur(1px); opacity: 0.92; }
          92% { filter: blur(0px); opacity: 1; }
        }
        @keyframes twh-charIn {
          0% { opacity: 0; transform: translateY(6px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-1px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes twh-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes twh-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* 标题 — 带对焦动画 */}
      <h1
        className="font-display mb-2 text-left text-[clamp(28px,4vw,34px)] font-semibold tracking-tight text-[var(--glass-text-primary)]"
      >
        {title}
      </h1>

      {/* 终端打字机副标题 */}
      <p className="flex h-6 items-center justify-start font-mono text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
        <span className="mr-1.5 opacity-50">&gt;_</span>
        {text.split('').map((char, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              animationName: isNewChar(i) ? 'twh-charIn' : 'twh-hover',
              animationDuration: isNewChar(i) ? '0.25s' : '3s',
              animationTimingFunction: isNewChar(i) ? 'ease-out' : 'ease-in-out',
              animationIterationCount: isNewChar(i) ? 1 : 'infinite',
              animationFillMode: isNewChar(i) ? 'forwards' : 'none',
              animationDelay: isNewChar(i) ? '0s' : `${i * 0.08}s`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
        <span
          className="inline-block w-2 h-4 ml-0.5 bg-[var(--glass-text-tertiary)] align-middle rounded-[1px]"
          style={{ animation: 'twh-blink 1s step-end infinite' }}
        />
      </p>
    </div>
  )
}
