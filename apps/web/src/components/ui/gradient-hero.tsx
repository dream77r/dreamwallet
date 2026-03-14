import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GradientHeroProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'alt' | 'success' | 'warm' | 'accent'
  /** Show only on mobile (hidden md:hidden), show clean version on desktop */
  compact?: boolean
}

const gradientMap = {
  default: 'gradient-hero',
  alt: 'gradient-hero-alt',
  success: 'gradient-success',
  warm: 'gradient-warm',
  accent: 'gradient-accent',
} as const

export function GradientHero({ children, className, variant = 'default', compact }: GradientHeroProps) {
  if (compact) {
    return (
      <>
        {/* Mobile: полный градиент */}
        <div
          className={cn(
            'md:hidden rounded-3xl p-6 text-white',
            gradientMap[variant],
            className,
          )}
        >
          {children}
        </div>
        {/* Desktop: чистый без градиента */}
        <div className={cn('hidden md:block', className)}>
          {children}
        </div>
      </>
    )
  }

  return (
    <div
      className={cn(
        'rounded-3xl p-6 md:p-8 text-white',
        gradientMap[variant],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface HeroStatProps {
  label: string
  value: string | ReactNode
  sublabel?: string
  className?: string
}

export function HeroStat({ label, value, sublabel, className }: HeroStatProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-sm font-medium opacity-80">{label}</span>
      <span className="text-display mt-1">{value}</span>
      {sublabel && <span className="text-sm opacity-70 mt-1">{sublabel}</span>}
    </div>
  )
}
