'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

function formatAmount(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

interface ComparisonData {
  expenseDiff: number
  win: boolean
  projectedExpense: number
  prevMonthExpense: number
  income: number
  expense: number
  prevIncome: number
  incomeDiff?: number
}

export function MonthComparisonWidget({ data, isLoading }: { data?: ComparisonData, isLoading?: boolean }) {
  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (!data) return null

  const incomeDiff = data.incomeDiff ?? (data.prevIncome > 0
    ? Math.round(((data.income - data.prevIncome) / data.prevIncome) * 100)
    : 0)

  return (
    <div className="glass-card card-default rounded-2xl">
      <div className="px-5 pt-5 pb-2">
        <p className="text-base font-bold tracking-tight">Этот месяц vs прошлый</p>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {data.win && (
          <div className="rounded-lg border border-income/20 bg-income/5 p-3 dark:border-income/20 dark:bg-income/10">
            <p className="text-sm font-semibold text-income">
              🎉 Тратишь на {Math.abs(data.expenseDiff)}% меньше чем в прошлом месяце
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Расходы</p>
            <p className="text-sm font-medium">
              {formatAmount(data.projectedExpense)}{' '}
              <span className="text-xs text-muted-foreground">vs {formatAmount(data.prevMonthExpense)}</span>
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            data.expenseDiff > 0 ? "text-expense" : "text-income"
          )}>
            {data.expenseDiff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {data.expenseDiff > 0 ? "+" : ""}{data.expenseDiff}%
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Доходы</p>
            <p className="text-sm font-medium">
              {formatAmount(data.income)}{' '}
              <span className="text-xs text-muted-foreground">vs {formatAmount(data.prevIncome)}</span>
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            incomeDiff > 0 ? "text-income" : "text-expense"
          )}>
            {incomeDiff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {incomeDiff > 0 ? "+" : ""}{incomeDiff}%
          </div>
        </div>
      </div>
    </div>
  )
}
