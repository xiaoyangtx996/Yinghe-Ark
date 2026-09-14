export const AI_STORY_MODES = {
  FROM_SCRATCH: 'from_scratch',
  EXPAND: 'expand',
  OPTIMIZE: 'optimize',
  REWRITE: 'rewrite',
} as const

export type AiStoryMode = (typeof AI_STORY_MODES)[keyof typeof AI_STORY_MODES]

export const AI_STORY_SELECTION_MODES = [
  AI_STORY_MODES.EXPAND,
  AI_STORY_MODES.OPTIMIZE,
  AI_STORY_MODES.REWRITE,
] as const

export type AiStorySelectionMode = (typeof AI_STORY_SELECTION_MODES)[number]

export function isAiStoryMode(value: unknown): value is AiStoryMode {
  return (
    value === AI_STORY_MODES.FROM_SCRATCH
    || value === AI_STORY_MODES.EXPAND
    || value === AI_STORY_MODES.OPTIMIZE
    || value === AI_STORY_MODES.REWRITE
  )
}

export function isAiStorySelectionMode(value: unknown): value is AiStorySelectionMode {
  return (
    value === AI_STORY_MODES.EXPAND
    || value === AI_STORY_MODES.OPTIMIZE
    || value === AI_STORY_MODES.REWRITE
  )
}

export function normalizeAiStoryMode(value: unknown): AiStoryMode {
  if (isAiStoryMode(value)) return value
  return AI_STORY_MODES.FROM_SCRATCH
}
