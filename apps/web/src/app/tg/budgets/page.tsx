'use client'

import { useEffect, useState } from 'react'
import { useTelegram } from '@/components/telegram/TelegramProvider'

interface BudgetItem {
  id: string
  category: string
  categoryIcon: string | null
  limit: number
  spent: number
  percentage: number
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function TgBudgetsPage() {
  const { isReady, isError, fetchWithAuth } = useTelegram()
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    fetchWithAuth('/api/tg/budgets')
      .then(r => r.json())
      .then((d: { budgets: BudgetItem[] }) => setBudgets(d.budgets))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [isReady, fetchWithAuth])

  if (isError) {
    return <p className="text-center text-muted-foreground pt-20">Аккаунт не привязан</p>
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-6 w-32 bg-muted rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold">Бюджеты</p>

      {budgets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Бюджеты не настроены</p>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const color = b.percentage >= 100 ? 'bg-red-500' : b.percentage >= 85 ? 'bg-yellow-500' : 'bg-green-500'
            return (
              <div key={b.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{b.categoryIcon ?? '📊'}</span>
                    <span className="text-sm font-medium">{b.category}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{b.percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{formatAmount(b.spent)}</span>
                  <span>из {formatAmount(b.limit)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
