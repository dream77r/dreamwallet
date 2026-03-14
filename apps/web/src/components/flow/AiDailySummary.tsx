'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles, TrendingDown, AlertTriangle } from 'lucide-react'
import { formatAmount } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

interface AiDailySummaryProps {
  todayExpense?: number
  topCategory?: string
  anomaly?: string | null
  currency?: string
  isLoading: boolean
}

export function AiDailySummary({
  todayExpense = 0,
  topCategory,
  anomaly,
  currency = 'RUB',
  isLoading,
}: AiDailySummaryProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (isLoading) {
    return (
      <div className="glass-card card-default rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  return (
    <div className="glass-card card-default rounded-2xl overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[10px] gradient-hero text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">AI сводка</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2.5">
          {/* Today expenses */}
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-expense shrink-0" />
            <span className="text-sm">
              Сегодня потрачено{' '}
              <span className="font-semibold text-expense">
                {formatAmount(todayExpense, currency)}
              </span>
            </span>
          </div>

          {/* Top category */}
          {topCategory && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 shrink-0 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">
                Топ категория: <span className="font-semibold">{topCategory}</span>
              </span>
            </div>
          )}

          {/* Anomaly */}
          {anomaly && (
            <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">{anomaly}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
