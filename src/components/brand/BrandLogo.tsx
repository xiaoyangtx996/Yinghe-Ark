'use client'

import Image from 'next/image'
import { brandAssetUrl, brandLogo } from '@/lib/brand/assets'

type BrandLogoVariant = 'horizontal' | 'vertical' | 'mark' | 'iconApp' | 'onLight' | 'onDark'

const VARIANTS: Record<
  BrandLogoVariant,
  { src: string; width: number; height: number; className?: string }
> = {
  horizontal: { src: brandLogo.horizontal, width: 221, height: 60 },
  vertical: { src: brandLogo.vertical, width: 84, height: 87 },
  mark: { src: brandLogo.mark, width: 149, height: 118 },
  iconApp: { src: brandLogo.iconApp, width: 108, height: 114 },
  onLight: { src: brandLogo.onLight, width: 137, height: 64 },
  onDark: { src: brandLogo.onDark, width: 139, height: 64 },
}

interface BrandLogoProps {
  variant?: BrandLogoVariant
  className?: string
  priority?: boolean
}

export default function BrandLogo({
  variant = 'horizontal',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const config = VARIANTS[variant]
  return (
    <Image
      src={brandAssetUrl(config.src)}
      alt="影核 Ark"
      width={config.width}
      height={config.height}
      priority={priority}
      className={`h-auto w-auto max-w-full object-contain ${className}`.trim()}
    />
  )
}
