'use client'

"use client"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

function formatAmount(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

export function MonthComparisonWidget({ data, isLoading }: { data?: any, isLoading?: boolean }) {

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (!data) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Этот месяц vs {data.prevMonthName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Win banner */}
        {data.win && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-950/20">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              🎉 Отлично! Тратишь на {Math.abs(data.expenseDiff)}% меньше чем в {data.prevMonthName}
            </p>
          </div>
        )}

        {/* Expense comparison */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Расходы</p>
            <p className="text-sm font-medium">
              {formatAmount(data.projectedExpense)} <span className="text-xs text-muted-foreground">vs {formatAmount(data.prev.expense)}</span>
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            data.expenseDiff > 0 ? "text-red-600" : "text-green-600"
          )}>
            {data.expenseDiff > 0
              ? <TrendingUp className="h-3.5 w-3.5" />
              : <TrendingDown className="h-3.5 w-3.5" />
            }
            {data.expenseDiff > 0 ? "+" : ""}{data.expenseDiff}%
          </div>
        </div>

        {/* Income comparison */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Доходы</p>
            <p className="text-sm font-medium">
              {formatAmount(data.curr.income)} <span className="text-xs text-muted-foreground">vs {formatAmount(data.prev.income)}</span>
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            data.incomeDiff > 0 ? "text-green-600" : "text-red-600"
          )}>
            {data.incomeDiff > 0
              ? <TrendingUp className="h-3.5 w-3.5" />
              : <TrendingDown className="h-3.5 w-3.5" />
            }
            {data.incomeDiff > 0 ? "+" : ""}{data.incomeDiff}%
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
