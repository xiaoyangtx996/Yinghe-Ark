/**
 * Normalize sidebar search input for matching (trim + lowercase + collapse spaces).
 */
export function normalizeSidebarSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

function compactQuery(query: string): string {
  return query.replace(/\s+/g, '')
}

/**
 * Match a sidebar row label against a search query.
 * Pure numeric queries match episode-number cues only (e.g. "12" → "第12集：…", not "第120集").
 * Other queries use case-insensitive substring match (spaces ignored for 第 N 集 style input).
 */
export function matchesSidebarSearch(label: string, query: string): boolean {
  const q = normalizeSidebarSearchQuery(query)
  if (!q) return true

  const qCompact = compactQuery(q)
  if (/^\d+$/.test(qCompact)) {
    const patterns = [
      new RegExp(`第\\s*0*${qCompact}\\s*集`),
      new RegExp(`(?:^|[\\s#])(?:ep\\.?\\s*)?0*${qCompact}(?:\\s|:|：|$)`, 'i'),
    ]
    return patterns.some((re) => re.test(label))
  }

  const haystack = compactQuery(label.toLowerCase())
  return haystack.includes(qCompact)
}

export function filterItemsBySidebarSearch<T extends { label: string }>(
  items: T[],
  query: string,
): T[] {
  const q = normalizeSidebarSearchQuery(query)
  if (!q) return items
  return items.filter((item) => matchesSidebarSearch(item.label, q))
}
