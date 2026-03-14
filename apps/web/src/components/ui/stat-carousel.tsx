import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCarouselProps {
  children: ReactNode
  className?: string
  /** Number of columns on desktop (default: 4) */
  columns?: 2 | 3 | 4
}

const colsMap = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
} as const

/**
 * Mobile: horizontal scroll. Desktop: grid.
 */
export function StatCarousel({ children, className, columns = 4 }: StatCarouselProps) {
  return (
    <div
      className={cn(
        // Mobile: horizontal scroll
        'flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4',
        // Desktop: grid
        'md:grid md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:snap-none',
        colsMap[columns],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | ReactNode
  icon?: ReactNode
  trend?: { value: number; label?: string }
  className?: string
  variant?: 'default' | 'gradient'
}

export function StatCard({ label, value, icon, trend, className, variant = 'default' }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 snap-start rounded-2xl p-4 min-w-[160px]',
        variant === 'default' && 'glass-card card-default',
        variant === 'gradient' && 'gradient-card glass-card',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption text-muted-foreground">{label}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="text-xl font-bold">{value}</div>
      {trend && (
        <div className={cn(
          'text-xs font-medium mt-1',
          trend.value > 0 ? 'text-income' : trend.value < 0 ? 'text-expense' : 'text-muted-foreground',
        )}>
          {trend.value > 0 ? '+' : ''}{trend.value}%
          {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  )
}
