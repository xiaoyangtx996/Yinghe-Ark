'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────

export interface SegmentedControlOption<T extends string = string> {
    value: T
    label: ReactNode
}

type SegmentedControlLayout = 'fill' | 'compact'
type SegmentedControlSize = 'md' | 'lg'

interface SegmentedControlProps<T extends string = string> {
    options: SegmentedControlOption<T>[]
    value: T
    onChange: (value: T) => void
    /** Layout mode: stretch to container or keep a compact left-aligned width */
    layout?: SegmentedControlLayout
    /** Control height: md ~40px, lg ~44px */
    size?: SegmentedControlSize
    /** Accessible name for the group */
    'aria-label'?: string
    /** Extra className on the outer container */
    className?: string
}

// ─── Component ────────────────────────────────────────

/**
 * Unified Film DI segmented control with sliding pill indicator.
 * Single source of truth for tab/segment UIs across the app.
 */
export function SegmentedControl<T extends string = string>({
    options,
    value,
    onChange,
    layout = 'fill',
    size = 'md',
    'aria-label': ariaLabel,
    className = '',
}: SegmentedControlProps<T>) {
    const gridRef = useRef<HTMLDivElement>(null)
    const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
    const isCompact = layout === 'compact'
    const isLg = size === 'lg'

    useEffect(() => {
        if (!gridRef.current) return
        const activeIndex = options.findIndex((opt) => opt.value === value)
        const buttons = gridRef.current.querySelectorAll<HTMLButtonElement>('button')
        const activeButton = buttons[activeIndex]
        if (activeButton) {
            setIndicator({ left: activeButton.offsetLeft, width: activeButton.offsetWidth })
        }
    }, [value, options, size])

    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={`rounded-[var(--glass-radius-lg)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-1 ${isCompact ? 'inline-block max-w-full' : 'block w-full'} ${className}`}
        >
            <div
                ref={gridRef}
                className={isCompact ? 'relative inline-grid grid-flow-col auto-cols-[minmax(96px,max-content)]' : 'relative grid'}
                style={isCompact ? undefined : { gridTemplateColumns: `repeat(${Math.max(1, options.length)}, minmax(0, 1fr))` }}
            >
                <div
                    className="pointer-events-none absolute top-0 bottom-0 rounded-[calc(var(--glass-radius-lg)-2px)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] shadow-[var(--glass-shadow-sm)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ left: indicator.left, width: indicator.width }}
                    aria-hidden
                />
                {options.map((opt) => {
                    const selected = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            aria-pressed={selected}
                            className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--glass-radius-lg)-2px)] px-3 text-[length:var(--glass-font-size-body)] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--glass-focus-ring-strong)] ${
                                isLg ? 'min-h-[44px] py-2' : 'min-h-[40px] py-1.5'
                            } ${
                                selected
                                    ? 'text-[var(--glass-text-primary)]'
                                    : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
                            }`}
                        >
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
