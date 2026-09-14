'use client'

/**
 * Right-edge stage rail — Vue Bits Line Sidebar feel + soft capsule active state.
 * Click behavior matches CapsuleNav: onItemClick(stageId).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type StepStatus = 'empty' | 'active' | 'processing' | 'ready'

export interface LineStageRailItem {
  id: string
  label: string
  status: StepStatus
  disabled?: boolean
  disabledLabel?: string
}

interface LineStageRailProps {
  items: LineStageRailItem[]
  activeId: string
  onItemClick: (id: string) => void
  projectId?: string
  episodeId?: string
}

const FALLOFF = (p: number) => p * p * (3 - 2 * p)
const PROXIMITY = 100
const SMOOTHING_MS = 100

function buildHref(projectId: string | undefined, episodeId: string | undefined, stageId: string) {
  if (!projectId) return undefined
  const params = new URLSearchParams()
  params.set('stage', stageId)
  if (episodeId) params.set('episode', episodeId)
  return `/workspace/${projectId}?${params.toString()}`
}

export function LineStageRail({
  items,
  activeId,
  onItemClick,
  projectId,
  episodeId,
}: LineStageRailProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const targetsRef = useRef<number[]>([])
  const currentsRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const activeIndexRef = useRef(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [compact, setCompact] = useState(false)

  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId))
  activeIndexRef.current = activeIndex

  const itemsSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.label}:${item.status}:${item.disabled ? 1 : 0}`).join('|'),
    [items],
  )

  useEffect(() => {
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compactMq = window.matchMedia('(max-width: 900px)')
    const syncMotion = () => setReducedMotion(motionMq.matches)
    const syncCompact = () => setCompact(compactMq.matches)
    syncMotion()
    syncCompact()
    motionMq.addEventListener('change', syncMotion)
    compactMq.addEventListener('change', syncCompact)
    return () => {
      motionMq.removeEventListener('change', syncMotion)
      compactMq.removeEventListener('change', syncCompact)
    }
  }, [])

  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05)
    lastRef.current = now
    const tau = Math.max(SMOOTHING_MS, 1) / 1000
    const k = 1 - Math.exp(-dt / tau)
    let moving = false

    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i]
      if (!el) continue
      const target = Math.max(targetsRef.current[i] || 0, activeIndexRef.current === i ? 1 : 0)
      const cur = currentsRef.current[i] || 0
      const next = cur + (target - cur) * k
      const settled = Math.abs(target - next) < 0.0015
      const value = settled ? target : next
      currentsRef.current[i] = value
      el.style.setProperty('--effect', value.toFixed(4))
      if (!settled) moving = true
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null
  }, [])

  const startLoop = useCallback(() => {
    if (reducedMotion || compact) return
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(runFrame)
  }, [reducedMotion, compact, runFrame])

  // Sync active floor without wiping proximity when only activeId changes
  useEffect(() => {
    for (let i = 0; i < currentsRef.current.length; i++) {
      const floor = i === activeIndex ? 1 : 0
      if (floor === 1) currentsRef.current[i] = Math.max(currentsRef.current[i] || 0, 1)
      itemRefs.current[i]?.style.setProperty(
        '--effect',
        Math.max(currentsRef.current[i] || 0, floor).toFixed(4),
      )
    }
    startLoop()
  }, [activeIndex, startLoop])

  // Rebuild buffers only when item identity/content actually changes
  useEffect(() => {
    const count = items.length
    itemRefs.current = itemRefs.current.slice(0, count)
    targetsRef.current = Array.from({ length: count }, () => 0)
    currentsRef.current = Array.from({ length: count }, (_, i) => (i === activeIndexRef.current ? 1 : 0))
    itemRefs.current.forEach((el, i) => {
      el?.style.setProperty('--effect', (currentsRef.current[i] || 0).toFixed(4))
    })
    startLoop()
    // itemsSignature captures content; activeIndex handled above
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid reset on new array identity
  }, [itemsSignature, items.length, startLoop])

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || compact) return
    const list = listRef.current
    if (!list) return
    const rect = list.getBoundingClientRect()
    const pointerY = event.clientY - rect.top
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i]
      if (!el) continue
      const center = el.offsetTop + el.offsetHeight / 2
      const distance = Math.abs(pointerY - center)
      targetsRef.current[i] = FALLOFF(Math.max(0, 1 - distance / PROXIMITY))
    }
    startLoop()
  }

  const handlePointerLeave = () => {
    targetsRef.current = targetsRef.current.map(() => 0)
    startLoop()
  }

  const handleItemActivate = (item: LineStageRailItem, event: React.MouseEvent) => {
    if (item.disabled) return
    const href = buildHref(projectId, episodeId, item.id)
    if ((event.button === 1 || event.ctrlKey || event.metaKey) && href) {
      window.open(href, '_blank')
      return
    }
    onItemClick(item.id)
  }

  return (
    <nav className="line-stage-rail" data-placement="line-right">
      <div
        ref={listRef}
        className="line-stage-rail__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((item, index) => {
          const active = item.id === activeId
          const href = buildHref(projectId, episodeId, item.id)
          return (
            <div key={item.id} className="line-stage-rail__row relative group">
              <button
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                aria-current={active ? 'true' : undefined}
                disabled={item.disabled}
                title={item.disabled ? item.disabledLabel : undefined}
                data-active={active ? 'true' : 'false'}
                data-stage-id={item.id}
                className="line-stage-rail__item"
                style={{ ['--effect' as string]: active || compact || reducedMotion ? (active ? '1' : '0') : undefined }}
                onClick={(event) => handleItemActivate(item, event)}
                onAuxClick={(event) => {
                  if (item.disabled || event.button !== 1 || !href) return
                  event.preventDefault()
                  window.open(href, '_blank')
                }}
              >
                <span className="line-stage-rail__marker" aria-hidden="true" />
                <span className="line-stage-rail__label">
                  <span className="line-stage-rail__index">
                    {String(index + 1).padStart(2, '0')}
                    {item.status === 'ready' && !item.disabled ? ' · ✓' : ''}
                    {item.status === 'processing' && !item.disabled ? ' · …' : ''}
                  </span>
                  <span className="line-stage-rail__name">{item.label}</span>
                </span>
              </button>
              {item.disabled && item.disabledLabel ? (
                <div className="pointer-events-none absolute right-full top-1/2 z-10 mr-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="glass-surface-soft whitespace-nowrap px-3 py-2 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-primary)]">
                    {item.disabledLabel}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

export default LineStageRail
