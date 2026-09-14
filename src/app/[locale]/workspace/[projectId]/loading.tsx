import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

const TAB_LABELS = ['故事', '拆解', '分镜', '成片', '配音', 'AI剪辑'] as const

/**
 * Soft-nav placeholder for /workspace/[projectId].
 * Renders stage-tab chrome immediately while the client page chunk loads.
 */
export default function ProjectWorkspaceLoading() {
  const loadingState = resolveTaskPresentationState({
    phase: 'processing',
    intent: 'generate',
    resource: 'text',
    hasOutput: false,
  })

  return (
    <div className="glass-page flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <aside
          className="theater-secondary hidden w-[240px] shrink-0 border-r border-[var(--glass-stroke-base)] lg:block"
          aria-hidden
        />
        <main className="flex min-h-0 flex-1 flex-col px-2 py-2 lg:px-3 lg:py-2">
          <div
            className="workspace-stage-switcher"
            role="tablist"
            aria-label="切换制作阶段"
            aria-busy="true"
          >
            {TAB_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                disabled
                className="workspace-stage-switcher__tab"
                data-active={index === 0 ? 'true' : 'false'}
                aria-selected={index === 0}
              >
                <span className="workspace-stage-switcher__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="workspace-stage-switcher__label">{label}</span>
              </button>
            ))}
          </div>
          <div className="glass-surface mt-3 flex flex-1 items-center justify-center">
            <TaskStatusInline state={loadingState} className="[&>span]:sr-only" />
          </div>
        </main>
      </div>
    </div>
  )
}
