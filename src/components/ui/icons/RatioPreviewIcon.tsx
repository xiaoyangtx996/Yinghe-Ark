import type { CSSProperties } from 'react'

type RatioPreviewVariant = 'surface' | 'surfaceStrong'

export interface RatioPreviewIconProps {
  ratio: string
  size?: number
  selected?: boolean
  variant?: RatioPreviewVariant
  radiusClassName?: string
}

function resolveUnselectedClass(variant: RatioPreviewVariant): string {
  if (variant === 'surface') {
    return 'bg-[var(--glass-bg-surface)] shadow-[0_0_0_1px_var(--glass-stroke-soft)]'
  }
  return 'bg-[var(--glass-bg-surface-strong)] shadow-[0_0_0_1px_var(--glass-stroke-base)]'
}

export function RatioPreviewIcon({
  ratio,
  size = 24,
  selected = false,
  variant = 'surfaceStrong',
  radiusClassName = 'rounded-[var(--glass-radius-xs)]',
}: RatioPreviewIconProps) {
  const [widthRatio, heightRatio] = ratio.split(':').map(Number)
  if (!Number.isFinite(widthRatio) || !Number.isFinite(heightRatio) || widthRatio <= 0 || heightRatio <= 0) {
    throw new Error(`Invalid ratio for RatioPreviewIcon: ${ratio}`)
  }

  const maxDimension = size
  let width = maxDimension
  let height = maxDimension

  if (widthRatio >= heightRatio) {
    height = Math.round((maxDimension * heightRatio) / widthRatio)
  } else {
    width = Math.round((maxDimension * widthRatio) / heightRatio)
  }

  const style: CSSProperties = {
    width,
    height,
    minWidth: width,
    minHeight: height,
  }

  const toneClass = selected
    ? 'bg-[var(--glass-tone-info-bg)] shadow-[0_0_0_1px_var(--glass-stroke-focus)]'
    : resolveUnselectedClass(variant)

  return <span aria-hidden="true" className={`${radiusClassName} block transition-all ${toneClass}`} style={style} />
}
