'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  illustration?: React.ReactNode
  className?: string
  variant?: 'card' | 'inline'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  illustration,
  className,
  variant = 'card',
}: EmptyStateProps) {
  const inner = (
    <div className="flex flex-col items-center gap-3 text-center animate-fade-up">
      {illustration ? (
        <div className="w-24 h-24">{illustration}</div>
      ) : typeof icon === 'string' ? (
        <span className="text-4xl">{icon}</span>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-[260px]">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        {inner}
      </div>
    )
  }

  return (
    <Card className={cn('flex items-center justify-center border-dashed py-16', className)}>
      {inner}
    </Card>
  )
}
