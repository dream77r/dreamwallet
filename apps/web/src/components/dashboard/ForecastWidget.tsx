'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

function formatAmount(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

export function ForecastWidget({ data, isLoading }: { data?: any, isLoading?: boolean }) {

  if (isLoading) return <Skeleton className="h-36 w-full" />
  if (!data) return null

  const statusColor = {
    good: "text-income bg-income/5 border-income/20 dark:bg-income/10 dark:border-income/20",
    warning: "text-yellow-600 bg-yellow-50 border-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-900/30",
    danger: "text-expense bg-expense/5 border-expense/20 dark:bg-expense/10 dark:border-expense/20",
  }[data.status as 'good' | 'warning' | 'danger'] ?? 'text-income bg-income/5 border-income/20'

  const progressPct = Math.min(100, (data.dayOfMonth / data.daysInMonth) * 100)

  return (
    <div className="glass-card card-default rounded-2xl">
      <div className="px-5 pt-5 pb-2">
        <p className="text-base font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Прогноз на месяц
        </p>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {/* Progress bar месяца */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>День {data.dayOfMonth}</span>
            <span>Осталось {data.daysLeft} дн.</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Прогноз */}
        <div className={cn("rounded-lg border p-3", statusColor)}>
          <p className="text-xs font-medium mb-0.5">Прогноз расходов до конца месяца</p>
          <p className="text-xl font-bold">{formatAmount(data.projectedExpense)}</p>
          {data.prevMonthExpense > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {data.vsLastMonth > 0
                ? <><TrendingUp className="h-3 w-3" /><span className="text-xs">+{data.vsLastMonth}% к прошлому месяцу</span></>
                : <><TrendingDown className="h-3 w-3" /><span className="text-xs">{data.vsLastMonth}% к прошлому месяцу</span></>
              }
            </div>
          )}
        </div>

        {/* Баланс */}
        {data.projectedIncome > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ожидаемый остаток</span>
            <span className={cn("font-semibold", data.projectedBalance >= 0 ? "text-income" : "text-expense")}>
              {formatAmount(data.projectedBalance)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
