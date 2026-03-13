'use client'

import { useEffect, useState } from 'react'
import { useTelegram } from '@/components/telegram/TelegramProvider'

interface DashboardData {
  balance: number
  currency: string
  accounts: Array<{ id: string; name: string; balance: number; currency: string }>
  transactions: Array<{
    id: string
    type: string
    amount: number
    currency: string
    description: string | null
    category: string | null
    categoryIcon: string | null
    date: string
  }>
}

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function TgDashboardPage() {
  const { isReady, isError, fetchWithAuth, userName } = useTelegram()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    fetchWithAuth('/api/tg/dashboard')
      .then(r => r.json())
      .then((d: DashboardData) => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [isReady, fetchWithAuth])

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-lg font-medium">Аккаунт не привязан</p>
        <p className="text-sm text-muted-foreground mt-1">Подключите Telegram в настройках DreamWallet</p>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-4 w-32 bg-muted rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold">
        {userName ? `Привет, ${userName}!` : 'DreamWallet'}
      </p>

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <p className="text-sm opacity-80">Общий баланс</p>
        <p className="text-3xl font-bold mt-1">{formatAmount(data.balance, data.currency)}</p>
        {data.accounts.length > 1 && (
          <div className="mt-3 space-y-1">
            {data.accounts.map(a => (
              <div key={a.id} className="flex justify-between text-sm opacity-80">
                <span>{a.name}</span>
                <span>{formatAmount(a.balance, a.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Последние транзакции</p>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Транзакций пока нет</p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-card border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base">
                  {tx.categoryIcon ?? (tx.type === 'INCOME' ? '🟢' : '🔴')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description || tx.category || 'Без описания'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
