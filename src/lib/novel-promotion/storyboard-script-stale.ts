/**
 * Mark storyboard out-of-date after script merge (P5.1).
 * Reuses NovelPromotionStoryboard.lastError with a stable prefix (no schema migration).
 */

export const STORYBOARD_SCRIPT_STALE_PREFIX = 'waoowaoo:script_stale:'

export const STORYBOARD_SCRIPT_STALE_MERGED = `${STORYBOARD_SCRIPT_STALE_PREFIX}merged`

export function isStoryboardScriptStale(lastError: string | null | undefined): boolean {
  return typeof lastError === 'string' && lastError.startsWith(STORYBOARD_SCRIPT_STALE_PREFIX)
}

/** Split displayable failure vs script-stale marker. */
export function resolveStoryboardErrorPresentation(
  lastError: string | null | undefined,
): { scriptStale: boolean; failedError: string | null } {
  if (!lastError || !String(lastError).trim()) {
    return { scriptStale: false, failedError: null }
  }
  if (isStoryboardScriptStale(lastError)) {
    return { scriptStale: true, failedError: null }
  }
  return { scriptStale: false, failedError: lastError }
}
