'use client'

import Image from 'next/image'
import { brandAssetUrl, brandOpIcon, type BrandOpIconName } from '@/lib/brand/assets'

interface BrandOpIconProps {
  name: BrandOpIconName
  size?: number
  className?: string
}

/** Raster op icon from Yinghe-Ark-design-assets (common-ops). */
export default function BrandOpIcon({ name, size = 28, className = '' }: BrandOpIconProps) {
  const src = brandOpIcon[name]
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
