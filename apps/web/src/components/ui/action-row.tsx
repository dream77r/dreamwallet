import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ActionRowProps {
  children: ReactNode
  className?: string
}

/**
 * Горизонтальный ряд кнопок быстрых действий (как в Revolut: Перевод, Пополнить, Карта)
 */
export function ActionRow({ children, className }: ActionRowProps) {
  return (
    <div className={cn('flex items-center gap-3 overflow-x-auto scrollbar-hide py-1', className)}>
      {children}
    </div>
  )
}

interface ActionButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  variant?: 'default' | 'primary' | 'gradient'
  className?: string
}

export function ActionButton({ icon, label, onClick, variant = 'default', className }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 min-w-[64px] tap-target',
        'transition-transform active:scale-95',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl',
          'transition-all duration-200',
          variant === 'default' && 'bg-muted hover:bg-muted/80 text-foreground',
          variant === 'primary' && 'bg-primary/10 hover:bg-primary/20 text-primary',
          variant === 'gradient' && 'gradient-hero text-white shadow-sm',
        )}
      >
        {icon}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </button>
  )
}
