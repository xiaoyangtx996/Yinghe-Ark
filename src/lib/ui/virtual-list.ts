/** When list length reaches this, SecondarySidebar switches to windowed rendering. */
export const SECONDARY_SIDEBAR_VIRTUAL_THRESHOLD = 48

/**
 * Fixed row stride for theater secondary items (row height + nav gap).
 * Keep in sync with `.theater-secondary__item-row` + `.theater-secondary__nav-items` gap.
 */
export const SECONDARY_SIDEBAR_ROW_STRIDE_PX = 44

/** Script clip peek rows (header + 2-line summary + spacing). */
export const SCRIPT_CLIP_VIRTUAL_THRESHOLD = 48

/** Approximate collapsed clip row height for window math (expanded row uses natural height). */
export const SCRIPT_CLIP_PEEK_STRIDE_PX = 96

export function shouldVirtualizeList(
  itemCount: number,
  threshold: number = SECONDARY_SIDEBAR_VIRTUAL_THRESHOLD,
): boolean {
  return itemCount >= threshold
}

export interface VirtualWindowInput {
  scrollTop: number
  viewportHeight: number
  itemCount: number
  itemSize: number
  overscan?: number
}

export interface VirtualWindow {
  startIndex: number
  endIndex: number
  offsetY: number
  totalHeight: number
}

/** Ensure a critical index (e.g. selected row) stays inside the rendered window. */
export function expandVirtualWindowToInclude(
  win: VirtualWindow,
  index: number,
  itemCount: number,
  itemSize: number,
): VirtualWindow {
  if (itemCount <= 0 || win.endIndex < 0 || index < 0 || index >= itemCount) return win
  const startIndex = Math.min(win.startIndex, index)
  const endIndex = Math.max(win.endIndex, index)
  return {
    startIndex,
    endIndex,
    offsetY: startIndex * itemSize,
    totalHeight: win.totalHeight,
  }
}

/**
 * Compute a fixed-size virtual window for a scrollable list.
 * `endIndex` is inclusive; empty lists return `endIndex: -1`.
 */
export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const {
    scrollTop,
    viewportHeight,
    itemCount,
    itemSize,
    overscan = 6,
  } = input

  if (itemCount <= 0 || itemSize <= 0) {
    return { startIndex: 0, endIndex: -1, offsetY: 0, totalHeight: 0 }
  }

  const totalHeight = itemCount * itemSize
  const safeScrollTop = Math.max(0, Math.min(scrollTop, Math.max(0, totalHeight - 1)))
  const startIndex = Math.max(0, Math.floor(safeScrollTop / itemSize) - overscan)
  const visibleCount = Math.max(1, Math.ceil(Math.max(0, viewportHeight) / itemSize))
  const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2)
  const offsetY = startIndex * itemSize

  return { startIndex, endIndex, offsetY, totalHeight }
}

/**
 * Clamp scrollTop so the target row is fully visible inside the viewport.
 */
export function scrollTopToRevealIndex(opts: {
  index: number
  itemSize: number
  viewportHeight: number
  scrollTop: number
  itemCount: number
}): number {
  const { index, itemSize, viewportHeight, scrollTop, itemCount } = opts
  if (itemCount <= 0 || itemSize <= 0 || index < 0 || index >= itemCount) {
    return scrollTop
  }
  const rowTop = index * itemSize
  const rowBottom = rowTop + itemSize
  if (rowTop < scrollTop) return rowTop
  if (rowBottom > scrollTop + viewportHeight) {
    return Math.max(0, rowBottom - viewportHeight)
  }
  return scrollTop
}
