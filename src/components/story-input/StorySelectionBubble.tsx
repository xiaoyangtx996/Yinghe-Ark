'use client'

interface StorySelectionBubbleProps {
  top: number
  left: number
  loading?: boolean
  disabled?: boolean
  labels: {
    expand: string
    optimize: string
    rewrite: string
    working: string
  }
  onExpand: () => void
  onOptimize: () => void
  onRewrite: () => void
}

export default function StorySelectionBubble({
  top,
  left,
  loading = false,
  disabled = false,
  labels,
  onExpand,
  onOptimize,
  onRewrite,
}: StorySelectionBubbleProps) {
  const busy = loading || disabled

  return (
    <div
      className="story-selection-bubble"
      style={{ top, left }}
      role="toolbar"
      aria-label="selection-ai"
      onMouseDown={(event) => {
        // Keep textarea selection while clicking bubble actions.
        event.preventDefault()
      }}
    >
      {loading ? (
        <span className="story-selection-bubble__status">{labels.working}</span>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={onExpand}>
            {labels.expand}
          </button>
          <span className="story-selection-bubble__sep" aria-hidden />
          <button type="button" disabled={busy} onClick={onOptimize}>
            {labels.optimize}
          </button>
          <span className="story-selection-bubble__sep" aria-hidden />
          <button type="button" disabled={busy} onClick={onRewrite}>
            {labels.rewrite}
          </button>
        </>
      )}
    </div>
  )
}
