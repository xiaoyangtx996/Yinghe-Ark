'use client'

import Image from 'next/image'
import { brandAssetUrl, brandNavIcon, type BrandNavIconName } from '@/lib/brand/assets'

interface BrandIconProps {
  name: BrandNavIconName
  size?: number
  className?: string
}

/** Raster nav icon from Yinghe-Ark-design-assets (core-20). */
export default function BrandIcon({ name, size = 20, className = '' }: BrandIconProps) {
  const src = brandNavIcon[name]
  return (
    <Image
      src={brandAssetUrl(src)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  )
}
