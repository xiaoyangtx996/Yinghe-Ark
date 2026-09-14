'use client'

import WorkspaceStageSwitcher, {
  type WorkspaceStageSwitcherItem,
} from './modes/novel-promotion/components/WorkspaceStageSwitcher'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

const BOOTSTRAP_STAGE_IDS = [
  'config',
  'script',
  'storyboard',
  'videos',
  'voice',
  'editor',
] as const

type EarlyWorkspaceShellProps = {
  activeStage: string
  onStageChange: (stage: string) => void
  labels: Record<(typeof BOOTSTRAP_STAGE_IDS)[number], string>
}

/**
 * Lightweight chrome shown while the NovelPromotionWorkspace chunk loads.
 * Keeps stage tabs clickable (URL/pane flip) without waiting for the heavy tree.
 */
export function EarlyWorkspaceShell({
  activeStage,
  onStageChange,
  labels,
}: EarlyWorkspaceShellProps) {
  const items: WorkspaceStageSwitcherItem[] = BOOTSTRAP_STAGE_IDS.map((id) => ({
    id,
    label: labels[id],
    status: id === activeStage ? 'active' : 'empty',
  }))

  const loadingState = resolveTaskPresentationState({
    phase: 'processing',
    intent: 'generate',
    resource: 'text',
    hasOutput: false,
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <WorkspaceStageSwitcher
        items={items}
        activeId={activeStage}
        onStageChange={onStageChange}
      />
      <div className="glass-surface flex flex-1 items-center justify-center p-8">
        <TaskStatusInline state={loadingState} className="[&>span]:sr-only" />
      </div>
    </div>
  )
}
