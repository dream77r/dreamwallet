'use client'

import { useEffect, useState } from 'react'
import { useTelegram } from '@/components/telegram/TelegramProvider'

interface SubItem {
  id: string
  name: string
  amount: number
  schedule: string
  monthlyAmount: number
  nextRunAt: string
  icon: string
  category: string
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function TgSubscriptionsPage() {
  const { isReady, isError, fetchWithAuth } = useTelegram()
  const [subs, setSubs] = useState<SubItem[]>([])
  const [totalMonthly, setTotalMonthly] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    fetchWithAuth('/api/tg/subscriptions')
      .then(r => r.json())
      .then((d: { subscriptions: SubItem[]; totalMonthly: number }) => {
        setSubs(d.subscriptions)
        setTotalMonthly(d.totalMonthly)
      })
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
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold">Подписки</p>

      {/* Total */}
      {subs.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-4 text-white">
          <p className="text-sm opacity-80">В месяц</p>
          <p className="text-2xl font-bold">{formatAmount(totalMonthly)}</p>
          <p className="text-xs opacity-70 mt-1">
            {subs.length} {subs.length === 1 ? 'подписка' : subs.length < 5 ? 'подписки' : 'подписок'}
          </p>
        </div>
      )}

      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Нет активных подписок</p>
      ) : (
        <div className="space-y-2">
          {subs.map(sub => {
            const days = daysUntil(sub.nextRunAt)
            const isUrgent = days >= 0 && days < 3
            return (
              <div
                key={sub.id}
                className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${isUrgent ? 'border-red-300 dark:border-red-800' : ''}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl">
                  {sub.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    след. {formatDate(sub.nextRunAt)}
                    {isUrgent && days >= 0 && (
                      <span className="ml-1 text-red-500 font-medium">
                        ({days === 0 ? 'сегодня' : `через ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`})
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">-{formatAmount(sub.amount)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
