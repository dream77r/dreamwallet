'use client'

import { TrendingUp, TrendingDown, ArrowLeftRight, Wallet } from 'lucide-react'
import Link from 'next/link'
import { AnimatedNumber } from '@/components/ui/animated-number'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

interface BalanceWidgetProps {
  stats: { totalBalance: number; monthIncome: number; monthExpense: number; monthNet: number } | undefined
  wallet: { currency: string; accounts: { id: string }[] } | undefined
  isLoading: boolean
}

export function BalanceWidget({ stats, wallet, isLoading }: BalanceWidgetProps) {
  if (!isLoading && (!wallet?.accounts?.length)) {
    return (
      <div className="glass-card card-default rounded-2xl p-8 animate-fade-up flex flex-col items-center justify-center gap-3 text-center">
        <span className="text-4xl">💳</span>
        <p className="text-sm font-medium text-foreground">Добавьте счёт, чтобы видеть баланс</p>
        <p className="text-xs text-muted-foreground">Банковская карта, наличные или накопительный</p>
        <Link href="/dashboard/accounts" className="text-sm font-semibold text-primary hover:underline">Создать счёт →</Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="glass-card card-default rounded-2xl p-6 animate-fade-up">
        <p className="text-caption text-muted-foreground mb-1">Общий баланс</p>
        {isLoading ? (
          <div className="h-12 w-48 animate-pulse bg-muted rounded-xl mb-4" />
        ) : (
          <p className="text-display text-foreground mb-4">
            <AnimatedNumber value={stats?.totalBalance ?? 0} currency={wallet?.currency} />
          </p>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-income/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-income" />
            </div>
            {isLoading ? <div className="h-4 w-20 animate-pulse bg-muted rounded" /> : (
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Доходы</p>
                <p className="text-sm font-bold text-income">+{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-expense/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-expense" />
            </div>
            {isLoading ? <div className="h-4 w-20 animate-pulse bg-muted rounded" /> : (
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Расходы</p>
                <p className="text-sm font-bold text-expense">-{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}</p>
              </div>
            )}
          </div>
          {stats && stats.monthIncome > 0 && (
            <div className="ml-auto">
              <p className="text-[11px] text-muted-foreground font-medium text-right">Сохранено</p>
              <p className="text-sm font-bold text-primary text-right">
                {Math.round((stats.monthNet / stats.monthIncome) * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Чистый доход', value: formatAmount(Math.abs(stats?.monthNet ?? 0), wallet?.currency), prefix: (stats?.monthNet ?? 0) >= 0 ? '+' : '-', colorClass: (stats?.monthNet ?? 0) >= 0 ? 'text-income' : 'text-expense', icon: ArrowLeftRight, bgColor: (stats?.monthNet ?? 0) >= 0 ? 'var(--income)' : 'var(--expense)' },
          { label: 'Счётов', value: String(wallet?.accounts.length ?? 0), prefix: '', colorClass: 'text-primary', icon: Wallet, bgColor: 'var(--primary)' },
        ].map((stat, i) => (
          <div key={i} className="glass-card card-default rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: stat.bgColor + '1A' }}>
              <stat.icon className={`h-5 w-5 ${stat.colorClass}`} />
            </div>
            {isLoading ? (
              <div className="h-6 w-16 animate-pulse bg-muted rounded mb-1" />
            ) : (
              <p className={`text-xl font-bold ${stat.colorClass}`}>{stat.prefix}{stat.value}</p>
            )}
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
