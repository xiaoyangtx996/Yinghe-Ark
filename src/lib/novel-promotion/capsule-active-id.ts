/**
 * Map URL/runtime stage ids onto CapsuleNav item ids.
 * Voice is a first-class capsule step; legacy `assets` aliases `script`
 * (ScriptStage renders both; prefer writing `stage=script` for new URLs).
 */
export function resolveCapsuleActiveId(stage: string): string {
  switch (stage) {
    case 'assets':
      return 'script'
    case 'novel':
    case 'text':
      return 'config'
    default:
      return stage
  }
}
