'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowLeftRight, Sparkles, Upload, Target, Flag } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useIsMobile } from '@/hooks/use-mobile'
import { BalanceHero } from './BalanceHero'
import { AiDailySummary } from './AiDailySummary'
import { TransactionFeed } from '@/components/transactions/TransactionFeed'
import { BudgetsWidget } from '@/components/dashboard/BudgetsWidget'
import { GoalsWidget } from '@/components/dashboard/GoalsWidget'

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

const quickActions = [
  { label: 'Перевод', href: '/dashboard/transactions', icon: ArrowLeftRight, gradient: false },
  { label: 'AI', href: '/dashboard/ai-chat', icon: Sparkles, gradient: true },
  { label: 'Импорт', href: '/dashboard/import', icon: Upload, gradient: false },
  { label: 'Бюджеты', href: '/dashboard/budgets', icon: Target, gradient: false },
  { label: 'Цели', href: '/dashboard/goals', icon: Flag, gradient: false },
]

export function FlowTab() {
  const isMobile = useIsMobile()
  const { start: monthStart, end: monthEnd } = useMemo(() => getCurrentMonthRange(), [])

  const { data: wallet, isLoading: walletLoading } = trpc.wallet.get.useQuery()
  const walletId = wallet?.id

  const { data: stats, isLoading: statsLoading } = trpc.wallet.getStats.useQuery(
    { walletId: walletId!, dateFrom: monthStart, dateTo: monthEnd },
    { enabled: !!walletId },
  )

  const { data: dash, isLoading: dashLoading } = trpc.wallet.dashboardData.useQuery(undefined, {
    staleTime: 30_000,
  })

  const isLoading = walletLoading || statsLoading
  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  // Compute today's expenses from dashboardData
  const todayExpense = (dash as Record<string, unknown> | undefined)?.todayExpense as number | undefined

  // Top category from dashboardData
  const topCategory = (dash as Record<string, unknown> | undefined)?.topCategory as string | undefined

  if (isMobile) {
    return (
      <div className="space-y-4 animate-fade-up">
        {/* Balance Hero — swipeable cards */}
        <BalanceHero
          totalBalance={stats?.totalBalance ?? 0}
          accounts={(wallet?.accounts ?? []) as Array<{ id: string; name: string; type: string; balance: unknown; currency: string; icon: string | null }>}
          currency={wallet?.currency}
          isLoading={isLoading}
        />

        {/* Quick actions */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-1.5 snap-start shrink-0 active:scale-95 transition-transform"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  action.gradient
                    ? 'gradient-hero text-white shadow-sm'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                <action.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* AI Daily Summary */}
        <AiDailySummary
          todayExpense={todayExpense ?? 0}
          topCategory={topCategory}
          currency={wallet?.currency}
          isLoading={dashLoading}
        />

        {/* Transaction Feed — infinite scroll */}
        <TransactionFeed variant="compact" />
      </div>
    )
  }

  // Desktop: two-column layout
  return (
    <div className="space-y-6 animate-fade-up">
      {/* Balance Hero — row of cards */}
      <BalanceHero
        totalBalance={stats?.totalBalance ?? 0}
        accounts={(wallet?.accounts ?? []) as Array<{ id: string; name: string; type: string; balance: unknown; currency: string; icon: string | null }>}
        currency={wallet?.currency}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Left column — Transaction Feed */}
        <div>
          <TransactionFeed variant="full" showColumnHeaders showDateHeaders />
        </div>

        {/* Right column — Widgets */}
        <div className="space-y-4">
          <AiDailySummary
            todayExpense={todayExpense ?? 0}
            topCategory={topCategory}
            currency={wallet?.currency}
            isLoading={dashLoading}
          />

          <BudgetsWidget
            budgets={dash?.budgets}
            isLoading={dashLoading}
            monthLabel={monthLabel}
          />

          <GoalsWidget goals={dash?.goals} />
        </div>
      </div>
    </div>
  )
}
