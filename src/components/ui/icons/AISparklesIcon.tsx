import { Sparkles } from 'lucide-react'
import { useId } from 'react'

interface AISparklesIconProps {
  className?: string
}

export default function AISparklesIcon({ className }: AISparklesIconProps) {
  const gradientId = useId().replace(/:/g, '')

  return (
    <Sparkles className={className} stroke={`url(#${gradientId})`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a56b32" />
          <stop offset="52%" stopColor="#8f5a28" />
          <stop offset="100%" stopColor="#c4894f" />
        </linearGradient>
      </defs>
    </Sparkles>
  )
}
