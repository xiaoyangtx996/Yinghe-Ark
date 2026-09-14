/**
 * Replace a closed [start, end) range in `source` with `replacement`.
 * Indices are UTF-16 code units (same as textarea selectionStart/End).
 */
export function replaceTextRange(
  source: string,
  start: number,
  end: number,
  replacement: string,
): string {
  const safeStart = Math.max(0, Math.min(start, source.length))
  const safeEnd = Math.max(safeStart, Math.min(end, source.length))
  return `${source.slice(0, safeStart)}${replacement}${source.slice(safeEnd)}`
}
