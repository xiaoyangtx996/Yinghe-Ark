export const SECONDARY_SCROLLBAR_THUMB_MIN_PX = 120
export const SECONDARY_SCROLLBAR_TRACK_WIDTH_PX = 4
/** Visual track width; hit area is wider via CSS padding. */
export const SECONDARY_SCROLLBAR_VISUAL_WIDTH_PX = 6

export interface ScrollThumbMetrics {
  /** Whether content overflows and a thumb should render. */
  needed: boolean
  top: number
  height: number
}

/**
 * Map scroll container metrics to a fixed-track custom scrollbar thumb.
 * Thumb height is at least `minThumbPx` when the track is tall enough.
 */
export function computeScrollThumbMetrics(opts: {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  minThumbPx?: number
}): ScrollThumbMetrics {
  const {
    scrollTop,
    scrollHeight,
    clientHeight,
    minThumbPx = SECONDARY_SCROLLBAR_THUMB_MIN_PX,
  } = opts

  if (clientHeight <= 0 || scrollHeight <= clientHeight + 1) {
    return { needed: false, top: 0, height: 0 }
  }

  const height = Math.min(
    clientHeight,
    Math.max(minThumbPx, (clientHeight / scrollHeight) * clientHeight),
  )
  const maxTop = Math.max(0, clientHeight - height)
  const maxScroll = scrollHeight - clientHeight
  const top = maxScroll <= 0 ? 0 : (scrollTop / maxScroll) * maxTop

  return { needed: true, top, height }
}

/** Convert a thumb Y position (within track) into scrollTop. */
export function scrollTopFromThumbOffset(opts: {
  thumbTop: number
  thumbHeight: number
  trackHeight: number
  scrollHeight: number
  clientHeight: number
}): number {
  const { thumbTop, thumbHeight, trackHeight, scrollHeight, clientHeight } = opts
  const maxScroll = Math.max(0, scrollHeight - clientHeight)
  const maxTop = Math.max(0, trackHeight - thumbHeight)
  if (maxTop <= 0 || maxScroll <= 0) return 0
  const clamped = Math.min(maxTop, Math.max(0, thumbTop))
  return (clamped / maxTop) * maxScroll
}

/** Jump scroll so the thumb centers on a track click Y (relative to track). */
export function scrollTopFromTrackClick(opts: {
  clickY: number
  thumbHeight: number
  trackHeight: number
  scrollHeight: number
  clientHeight: number
}): number {
  const { clickY, thumbHeight, trackHeight, scrollHeight, clientHeight } = opts
  const thumbTop = clickY - thumbHeight / 2
  return scrollTopFromThumbOffset({
    thumbTop,
    thumbHeight,
    trackHeight,
    scrollHeight,
    clientHeight,
  })
}
