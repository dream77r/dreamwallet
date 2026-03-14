'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface GoalsWidgetProps {
  goals: Array<{
    id: string
    name: string
    isCompleted: boolean
    currentAmount: unknown
    targetAmount: unknown
    color: string | null
    icon: string | null
  }> | undefined
}

export function GoalsWidget({ goals }: GoalsWidgetProps) {
  const active = goals?.filter((g) => !g.isCompleted) ?? []
  if (!active.length) return null

  return (
    <Card className="bg-card rounded-2xl shadow-sm border-0 dark:shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold tracking-tight">Финансовые цели</CardTitle>
          <Link href="/dashboard/goals" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            Все цели →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.slice(0, 3).map((goal) => {
            const current = Number(goal.currentAmount)
            const target = Number(goal.targetAmount)
            const pct = Math.min(100, Math.round((current / target) * 100))
            const color = goal.color ?? '#007AFF'
            return (
              <div key={goal.id} className="space-y-2 rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{goal.icon ?? '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{goal.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {pct}% из {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(target)}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
