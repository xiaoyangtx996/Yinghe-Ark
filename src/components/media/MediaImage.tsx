'use client'

import Image from 'next/image'
import type { CSSProperties, ImgHTMLAttributes, MouseEventHandler } from 'react'
import { toDisplayImageUrl } from '@/lib/media/image-url'

export type MediaImageProps = {
  src: string | null | undefined
  alt: string
  className?: string
  style?: CSSProperties
  onClick?: MouseEventHandler<HTMLImageElement>
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'>

function isStableMediaRoute(src: string) {
  return src.startsWith('/m/')
}

export function MediaImage({
  src,
  alt,
  className,
  style,
  onClick,
  fill = false,
  width = 1200,
  height = 1200,
  sizes,
  priority = false,
  ...imgProps
}: MediaImageProps) {
  // Storage keys like `images/panel-candidate-….jpg` must not be used as relative
  // URLs (would resolve under /zh/… and 404). Normalize before paint.
  const resolvedSrc = toDisplayImageUrl(src)
  if (!resolvedSrc) return null

  if (isStableMediaRoute(resolvedSrc)) {
    if (fill) {
      return (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes || '100vw'}
          priority={priority}
          className={className}
          style={style}
          onClick={onClick}
          {...imgProps}
        />
      )
    }

    return (
      <Image
        src={resolvedSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className={className}
        style={style}
        onClick={onClick}
        {...imgProps}
      />
    )
  }

  return (
    // 外部 URL 兜底，避免 next/image 远程域名限制影响兼容链路
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      loading={priority ? 'eager' : 'lazy'}
      {...imgProps}
    />
  )
}
