export const WORKSPACE_STAGES = [
  'config',
  'script',
  'assets',
  'text-storyboard',
  'storyboard',
  'videos',
  'voice',
  'editor',
] as const

export type WorkspaceStage = (typeof WORKSPACE_STAGES)[number]

export function isWorkspaceStage(value: string | null | undefined): value is WorkspaceStage {
  return typeof value === 'string' && (WORKSPACE_STAGES as readonly string[]).includes(value)
}

/**
 * Resolve the stage shown in the workspace from the URL.
 * Editor stays as `editor` so the honesty gate can render (no silent remap to videos).
 */
export function resolveWorkspaceStage(urlStage: string | null | undefined): WorkspaceStage {
  if (isWorkspaceStage(urlStage)) return urlStage
  return 'config'
}
