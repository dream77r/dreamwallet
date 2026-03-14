'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

interface RecentTransactionsWidgetProps {
  transactions: Array<{
    id: string
    type: string
    amount: unknown
    description: string | null
    counterparty: string | null
    date: Date | string
    currency: string
    category: { name: string } | null
    account: { name: string }
  }> | undefined
  isLoading: boolean
}

export function RecentTransactionsWidget({ transactions, isLoading }: RecentTransactionsWidgetProps) {
  return (
    <div className="bg-card rounded-3xl shadow-card border-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-base font-bold tracking-tight">Последние транзакции</p>
        <p className="text-xs font-medium text-muted-foreground">5 последних операций</p>
      </div>
      <div>
        {isLoading ? (
          <div className="space-y-3 px-5 pb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !transactions?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground px-5 pb-5">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-medium">Здесь появятся ваши транзакции</p>
            <Link href="/dashboard/transactions" className="text-xs font-medium text-primary hover:underline">Добавить первую →</Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'INCOME'
              const amount = Number(tx.amount)
              const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isIncome ? 'bg-[#34C759]/10' : 'bg-[#FF3B30]/10'}`}>
                      {isIncome ? <ArrowUpRight className="h-5 w-5 text-[#34C759]" /> : <ArrowDownRight className="h-5 w-5 text-[#FF3B30]" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {tx.description ?? tx.counterparty ?? (isIncome ? 'Доход' : 'Расход')}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {tx.category?.name ?? 'Без категории'} · {dateLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold tabular-nums ${isIncome ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {isIncome ? '+' : '-'}{formatAmount(amount, tx.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">{tx.account.name}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
