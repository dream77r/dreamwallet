import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ChartContainerProps {
  children: ReactNode
  title?: string
  subtitle?: string
  /** Right-side actions (period pills, etc.) */
  actions?: ReactNode
  className?: string
  /** Mobile height / Desktop height */
  height?: { mobile: number; desktop: number }
}

export function ChartContainer({
  children,
  title,
  subtitle,
  actions,
  className,
  height = { mobile: 200, desktop: 320 },
}: ChartContainerProps) {
  return (
    <div className={cn('glass-card card-default rounded-2xl p-4 md:p-6', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold text-base">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div
        className="w-full"
        style={{
          height: `var(--chart-h-mobile, ${height.mobile}px)`,
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            :root { --chart-h-mobile: ${height.desktop}px; }
          }
        `}</style>
        {children}
      </div>
    </div>
  )
}

interface PeriodPillsProps {
  periods: { label: string; value: string }[]
  active: string
  onChange: (value: string) => void
  className?: string
}

export function PeriodPills({ periods, active, onChange, className }: PeriodPillsProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-muted rounded-full p-0.5', className)}>
      {periods.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            active === value ? 'period-pill-active' : 'period-pill',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
