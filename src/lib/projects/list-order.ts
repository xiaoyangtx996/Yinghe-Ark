export type ProjectAccessOrderFields = {
  createdAt: Date
  lastAccessedAt: Date | null
}

/**
 * List ranking intent:
 * 1. Never-accessed (null lastAccessedAt) first, by createdAt desc
 * 2. Accessed projects by lastAccessedAt desc
 */
export function compareProjectsByAccessRecency(
  a: ProjectAccessOrderFields,
  b: ProjectAccessOrderFields,
): number {
  if (!a.lastAccessedAt && !b.lastAccessedAt) {
    return b.createdAt.getTime() - a.createdAt.getTime()
  }
  if (!a.lastAccessedAt && b.lastAccessedAt) return -1
  if (a.lastAccessedAt && !b.lastAccessedAt) return 1
  return b.lastAccessedAt!.getTime() - a.lastAccessedAt!.getTime()
}

/** MySQL ORDER BY fragment matching compareProjectsByAccessRecency (no leading ORDER BY). */
export const PROJECT_ACCESS_ORDER_BY_SQL = `
  CASE WHEN lastAccessedAt IS NULL THEN 0 ELSE 1 END ASC,
  CASE WHEN lastAccessedAt IS NULL THEN createdAt ELSE lastAccessedAt END DESC
`.trim()
