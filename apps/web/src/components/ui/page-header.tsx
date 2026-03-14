import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  /** Right-side action buttons */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, children, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-title md:text-headline">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 mt-3 md:mt-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
