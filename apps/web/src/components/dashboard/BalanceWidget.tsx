'use client'

import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatAmount } from '@/lib/format'

interface BalanceWidgetProps {
  stats: { totalBalance: number; monthIncome: number; monthExpense: number; monthNet: number } | undefined
  wallet: { currency: string; accounts: { id: string }[] } | undefined
  isLoading: boolean
}

export function BalanceWidget({ stats, wallet, isLoading }: BalanceWidgetProps) {
  if (!isLoading && (!wallet?.accounts?.length)) {
    return (
      <div className="gradient-hero rounded-2xl p-8 text-white flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
        <Wallet className="h-10 w-10 opacity-60" />
        <p className="text-base font-semibold">Добавьте счёт, чтобы видеть баланс</p>
        <p className="text-sm opacity-70">Банковская карта, наличные или накопительный</p>
        <Link href="/dashboard/accounts" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 transition-colors">
          Создать счёт <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  const savingsRate = stats && stats.monthIncome > 0
    ? Math.round((stats.monthNet / stats.monthIncome) * 100)
    : null

  return (
    <div className="gradient-hero rounded-2xl relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-white/[0.04]" />

      <div className="relative z-10 p-5 md:p-7 text-white">
        {/* Balance */}
        <p className="text-xs font-medium uppercase tracking-wider opacity-60 mb-1">Общий баланс</p>
        {isLoading ? (
          <div className="h-11 w-56 animate-pulse bg-white/20 rounded-xl mb-5" />
        ) : (
          <p className="text-[40px] md:text-display font-bold tracking-tight leading-none mb-5">
            <AnimatedNumber value={stats?.totalBalance ?? 0} currency={wallet?.currency} className="text-white" />
          </p>
        )}

        {/* Income / Expense / Savings row */}
        <div className="flex flex-wrap items-stretch gap-2">
          {/* Income */}
          <div className="flex items-center gap-2.5 bg-white/[0.12] rounded-xl px-3.5 py-2.5 flex-1 min-w-[140px]">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            {isLoading ? <div className="h-5 w-16 animate-pulse bg-white/15 rounded" /> : (
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider opacity-50">Доходы</p>
                <p className="text-sm font-bold truncate">+{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}</p>
              </div>
            )}
          </div>

          {/* Expense */}
          <div className="flex items-center gap-2.5 bg-white/[0.12] rounded-xl px-3.5 py-2.5 flex-1 min-w-[140px]">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
            {isLoading ? <div className="h-5 w-16 animate-pulse bg-white/15 rounded" /> : (
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider opacity-50">Расходы</p>
                <p className="text-sm font-bold truncate">-{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}</p>
              </div>
            )}
          </div>

          {/* Savings Rate */}
          {savingsRate !== null && (
            <div className="flex items-center justify-center bg-white/[0.12] rounded-xl px-4 py-2.5 min-w-[80px]">
              <div className="text-center">
                <p className="text-xl font-bold leading-tight">{savingsRate}%</p>
                <p className="text-[10px] uppercase tracking-wider opacity-50">норма</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
