/**
 * Query-only workspace URL updates without App Router soft navigation.
 * router.replace on this page re-reconciles a huge episode sidebar and feels like 1s+ menu lag.
 */

export type WorkspaceUrlQueryUpdates = {
  stage?: string
  episode?: string | null
}

export function mergeWorkspaceSearchParams(
  liveSearch: string,
  updates: WorkspaceUrlQueryUpdates,
): URLSearchParams {
  const raw = liveSearch.startsWith('?') ? liveSearch.slice(1) : liveSearch
  const params = new URLSearchParams(raw)
  if (updates.stage !== undefined) {
    params.set('stage', updates.stage)
  }
  if (updates.episode !== undefined) {
    if (updates.episode) {
      params.set('episode', updates.episode)
    } else {
      params.delete('episode')
    }
  }
  return params
}

/** Apply query string via native history.replaceState; returns the new path+search+hash.
 * Prefer `History.prototype.replaceState` — Next.js may wrap `window.history.replaceState`
 * and defer the visible `location` update by ~1s on soft navigations.
 */
export function replaceBrowserWorkspaceQuery(params: URLSearchParams): string {
  if (typeof window === 'undefined') return ''
  const qs = params.toString()
  const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  History.prototype.replaceState.call(
    window.history,
    window.history.state ?? null,
    '',
    nextUrl,
  )
  return nextUrl
}

export function readWorkspaceQueryMirror(search: string): {
  stage: string | null
  episode: string | null
} {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  return {
    stage: params.get('stage'),
    episode: params.get('episode'),
  }
}

/**
 * Imperatively flip keep-alive stage panes so the visible body updates inside the click
 * without waiting for React to reconcile the workspace tree.
 */
export function applyWorkspaceStagePanes(stage: string): void {
  if (typeof document === 'undefined') return
  const root = document.querySelector('[data-workspace-stage-panes]')
  if (!root) return
  const showScript = stage === 'script' || stage === 'assets'
  for (const node of Array.from(root.querySelectorAll('[data-stage-pane]'))) {
    const el = node as HTMLElement
    const id = el.getAttribute('data-stage-pane')
    const on = id === 'script' ? showScript : id === stage
    el.classList.toggle('hidden', !on)
    el.setAttribute('aria-hidden', on ? 'false' : 'true')
  }
}
