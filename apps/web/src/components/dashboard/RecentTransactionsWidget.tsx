'use client'

import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { formatAmount } from '@/lib/format'

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
    <div className="glass-card card-default rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-base font-bold tracking-tight">Последние транзакции</p>
          <p className="text-xs text-muted-foreground">5 последних операций</p>
        </div>
        <Link
          href="/dashboard/transactions"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Все <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div>
        {isLoading ? (
          <div className="space-y-1 px-5 pb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : !transactions?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground px-5 pb-5">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-medium">Здесь появятся ваши транзакции</p>
            <Link href="/dashboard/transactions" className="text-xs font-semibold text-primary hover:underline">Добавить первую →</Link>
          </div>
        ) : (
          <div>
            {transactions.map((tx, i) => {
              const isIncome = tx.type === 'INCOME'
              const amount = Number(tx.amount)
              const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
              return (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30 ${
                    i < transactions.length - 1 ? 'border-b border-border/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isIncome ? 'bg-income/10' : 'bg-expense/10'
                    }`}>
                      {isIncome
                        ? <ArrowUpRight className="h-5 w-5 text-income" />
                        : <ArrowDownRight className="h-5 w-5 text-expense" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">
                        {tx.description ?? tx.counterparty ?? (isIncome ? 'Доход' : 'Расход')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tx.category?.name ?? 'Без категории'} · {dateLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-sm font-bold tabular-nums ${isIncome ? 'text-income' : 'text-expense'}`}>
                      {isIncome ? '+' : '-'}{formatAmount(amount, tx.currency)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{tx.account.name}</p>
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
