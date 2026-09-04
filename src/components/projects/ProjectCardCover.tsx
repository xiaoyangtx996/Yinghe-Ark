'use client'

import { useState } from 'react'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'

const FALLBACK_GRADIENTS = [
  'var(--cover-gradient-0)',
  'var(--cover-gradient-1)',
  'var(--cover-gradient-2)',
] as const

const GENRE_GRADIENTS: Record<string, string> = {
  urban_slice: 'var(--cover-gradient-urban)',
  romance_mogul: 'var(--cover-gradient-romance)',
  mystery_rules: 'var(--cover-gradient-mystery)',
}

export function resolveProjectCoverGradient(
  genrePack: string | null | undefined,
  seedIndex = 0,
): string {
  if (genrePack && GENRE_GRADIENTS[genrePack]) return GENRE_GRADIENTS[genrePack]
  return FALLBACK_GRADIENTS[Math.abs(seedIndex) % FALLBACK_GRADIENTS.length]
}

export function projectNameInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'P'
  return Array.from(trimmed)[0]?.toUpperCase() ?? 'P'
}

interface ProjectCardCoverProps {
  name: string
  coverImageUrl?: string | null
  genrePack?: string | null
  seedIndex?: number
  className?: string
}

export default function ProjectCardCover({
  name,
  coverImageUrl,
  genrePack,
  seedIndex = 0,
  className = 'aspect-[16/10]',
}: ProjectCardCoverProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const initial = projectNameInitial(name)
  const gradient = resolveProjectCoverGradient(genrePack, seedIndex)
  const showImage = Boolean(coverImageUrl) && !imageFailed

  if (showImage && coverImageUrl) {
    return (
      <div className={`relative overflow-hidden border-b border-[var(--glass-stroke-base)] ${className}`}>
        <MediaImageWithLoading
          src={coverImageUrl}
          alt={name}
          containerClassName="h-full w-full"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border-b border-[var(--glass-stroke-base)] ${className}`}
      style={{ background: gradient }}
      aria-hidden
    >
      <span className="font-display text-4xl font-medium tracking-wide text-[var(--cover-initial-fg)] drop-shadow-sm">
        {initial}
      </span>
    </div>
  )
}
