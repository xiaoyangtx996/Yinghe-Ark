'use client'

import { useEffect, useRef, useState } from 'react'

type StepStatus = 'empty' | 'active' | 'processing' | 'ready'

export interface WorkspaceStageSwitcherItem {
  id: string
  label: string
  status: StepStatus
  disabled?: boolean
  disabledLabel?: string
}

interface WorkspaceStageSwitcherProps {
  items: WorkspaceStageSwitcherItem[]
  activeId: string
  onStageChange: (stageId: string) => void
}

function statusMark(item: WorkspaceStageSwitcherItem): string {
  if (item.disabled) return ''
  if (item.status === 'ready') return '✓'
  if (item.status === 'processing') return '…'
  return ''
}

/**
 * One-click stage rail — dropdown was an extra open hop and felt like menu lag.
 * Optimistic local id + imperative data-active paint before parent flushSync settles.
 */
export default function WorkspaceStageSwitcher({
  items,
  activeId,
  onStageChange,
}: WorkspaceStageSwitcherProps) {
  const [optimisticId, setOptimisticId] = useState(activeId)
  const rootRef = useRef<HTMLDivElement>(null)
  const displayId = items.some((item) => item.id === optimisticId) ? optimisticId : activeId

  useEffect(() => {
    setOptimisticId(activeId)
  }, [activeId])

  return (
    <div
      ref={rootRef}
      className="workspace-stage-switcher"
      role="tablist"
      aria-label="切换制作阶段"
    >
      {items.map((item, index) => {
        const selected = item.id === displayId
        const mark = statusMark(item)
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            title={item.disabled ? item.disabledLabel : item.label}
            className="workspace-stage-switcher__tab"
            data-stage-id={item.id}
            data-active={selected ? 'true' : 'false'}
            onClick={() => {
              if (item.disabled || item.id === displayId) return
              setOptimisticId(item.id)
              const root = rootRef.current
              if (root) {
                for (const tab of Array.from(root.querySelectorAll<HTMLElement>('.workspace-stage-switcher__tab'))) {
                  const on = tab.dataset.stageId === item.id
                  tab.dataset.active = on ? 'true' : 'false'
                  tab.setAttribute('aria-selected', on ? 'true' : 'false')
                }
              }
              onStageChange(item.id)
            }}
          >
            <span className="workspace-stage-switcher__index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="workspace-stage-switcher__label">{item.label}</span>
            {mark ? (
              <span className="workspace-stage-switcher__tab-mark" aria-hidden>
                {mark}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
