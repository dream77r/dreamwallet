'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BudgetProgressRing } from '@/components/budgets/BudgetProgressRing'
import Link from 'next/link'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

interface BudgetsWidgetProps {
  budgets: Array<{ id: string; amount: unknown; spentAmount: number; percentage: number; category: { name: string } }> | undefined
  isLoading: boolean
  monthLabel: string
}

export function BudgetsWidget({ budgets, isLoading, monthLabel }: BudgetsWidgetProps) {
  return (
    <Card className="bg-card rounded-2xl shadow-sm border-0 dark:shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold tracking-tight">Бюджеты</CardTitle>
        <CardDescription className="text-xs font-medium text-muted-foreground">Прогресс на {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-3 w-2/3 rounded-lg" />
              </div>
            </div>
          ))
        ) : !budgets || budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
            <span className="text-3xl">📊</span>
            <p className="text-sm font-medium">Бюджет поможет контролировать траты</p>
            <Link href="/dashboard/budgets" className="text-xs font-medium text-primary hover:underline">Задать бюджет →</Link>
          </div>
        ) : (
          budgets.map((budget) => {
            const budgetAmount = Number(budget.amount)
            const over = budget.spentAmount > budgetAmount
            const pct = budget.percentage
            return (
              <div key={budget.id} className="flex items-center gap-3">
                <BudgetProgressRing percentage={pct} size={48} strokeWidth={4} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate">{budget.category.name}</span>
                    <span className={`text-xs font-medium shrink-0 ml-2 ${over ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formatAmount(budget.spentAmount)} / {formatAmount(budgetAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {over ? (
                      <span className="text-red-500">Превышен на {formatAmount(budget.spentAmount - budgetAmount)}</span>
                    ) : (
                      <span>Остаток {formatAmount(budgetAmount - budget.spentAmount)}</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
