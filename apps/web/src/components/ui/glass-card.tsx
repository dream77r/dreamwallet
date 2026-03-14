import { cn } from '@/lib/utils'
import { forwardRef, type HTMLAttributes } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive'
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card rounded-3xl',
          variant === 'default' && 'card-default',
          variant === 'elevated' && 'card-elevated',
          variant === 'interactive' && 'card-interactive',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)
GlassCard.displayName = 'GlassCard'
