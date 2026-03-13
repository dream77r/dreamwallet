'use client'

import { cn } from '@/lib/utils'

interface StreakBadgeProps {
  streak: number
  className?: string
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600',
        streak >= 30 && 'bg-red-50 text-red-600',
        streak >= 7 && streak < 30 && 'bg-orange-50 text-orange-600',
        className,
      )}
      title={`Стрик: ${streak} дней подряд`}
    >
      <span className="text-sm leading-none">🔥</span>
      <span className="tabular-nums">{streak}</span>
    </span>
  )
}
