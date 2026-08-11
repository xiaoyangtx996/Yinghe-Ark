'use client'

import type { ComponentProps } from 'react'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { AppIcon } from '@/components/ui/icons'

interface ApiConfigToolbarProps {
  title: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  savingState: ComponentProps<typeof TaskStatusInline>['state'] | null
  savingLabel: string
  savedLabel: string
  saveFailedLabel: string
}

export function ApiConfigToolbar({
  saveStatus,
  savingState,
  savingLabel,
  savedLabel,
  saveFailedLabel,
}: ApiConfigToolbarProps) {
  if (saveStatus === 'idle') return null

  return (
    <div className="mb-4 flex items-center justify-end gap-2 text-sm">
      {saveStatus === 'saving' && (
        <span className="glass-chip glass-chip-info flex items-center gap-1">
          <TaskStatusInline state={savingState} className="[&>span]:sr-only" />
          <span>{savingLabel}</span>
        </span>
      )}
      {saveStatus === 'saved' && (
        <span className="glass-chip glass-chip-success flex items-center gap-1">
          <AppIcon name="check" className="w-4 h-4" />
          {savedLabel}
        </span>
      )}
      {saveStatus === 'error' && (
        <span className="glass-chip glass-chip-danger flex items-center gap-1">
          <AppIcon name="close" className="w-4 h-4" />
          {saveFailedLabel}
        </span>
      )}
    </div>
  )
}
