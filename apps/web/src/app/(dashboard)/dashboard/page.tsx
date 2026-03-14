'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/lib/trpc/client'
import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileHome } from '@/components/dashboard/MobileHome'
import { DesktopDashboard } from '@/components/dashboard/DesktopDashboard'
import { BalanceWidget } from '@/components/dashboard/BalanceWidget'
import { BudgetsWidget } from '@/components/dashboard/BudgetsWidget'
import { RecentTransactionsWidget } from '@/components/dashboard/RecentTransactionsWidget'
import { GoalsWidget } from '@/components/dashboard/GoalsWidget'
import { AiInsights } from '@/components/dashboard/ai-insights'

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function getCurrentMonthLabel() {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

import type { WidgetConfig } from '@/server/routers/dashboard'

function SmartGreeting({ data, isLoading }: { data: { message: string; status: string } | undefined; isLoading: boolean }) {
  if (isLoading) return (
    <div className="space-y-1">
      <div className="h-7 w-72 animate-pulse bg-muted rounded-xl" />
      <div className="h-4 w-44 animate-pulse bg-muted rounded-xl" />
    </div>
  )
  if (!data) return <div><h1 className="text-headline">Обзор</h1></div>
  const borderColor = data.status === 'good' ? 'border-l-[#34C759]' : data.status === 'warning' ? 'border-l-yellow-500' : 'border-l-[#FF3B30]'
  return (
    <div className={`border-l-4 pl-3 ${borderColor}`}>
      <p className="text-headline leading-snug max-w-xl">{data.message}</p>
      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { start: monthStart, end: monthEnd } = useMemo(() => getCurrentMonthRange(), [])

  const { data: wallet, isLoading: walletLoading } = trpc.wallet.get.useQuery()
  const { data: settingsData } = trpc.settings.get.useQuery()

  useEffect(() => {
    if (settingsData && !settingsData.onboardingDone && !settingsData.userProfile) {
      router.replace('/onboarding')
    }
  }, [settingsData, router])

  const walletId = wallet?.id

  const { data: stats, isLoading: statsLoading } = trpc.wallet.getStats.useQuery(
    { walletId: walletId!, dateFrom: monthStart, dateTo: monthEnd },
    { enabled: !!walletId },
  )

  const { data: cashFlowRaw, isLoading: cashFlowLoading } = trpc.wallet.getCashFlow.useQuery(
    { walletId: walletId!, months: 12 },
    { enabled: !!walletId },
  )

  const { data: categoryBreakdown, isLoading: categoryLoading } = trpc.wallet.getCategoryBreakdown.useQuery(
    { walletId: walletId!, type: 'EXPENSE', dateFrom: monthStart, dateTo: monthEnd },
    { enabled: !!walletId },
  )

  const { data: dash, isLoading: dashLoading } = trpc.wallet.dashboardData.useQuery(undefined, { staleTime: 30_000 })

  const { data: recentTxData, isLoading: txLoading } = trpc.transaction.list.useQuery({
    page: 1, pageSize: 5, sortBy: 'date', sortOrder: 'desc',
  })

  const { data: layoutData, isLoading: layoutLoading } = trpc.dashboard.getLayout.useQuery()
  const [optimisticLayout, setOptimisticLayout] = useState<WidgetConfig[] | null>(null)
  const layout = optimisticLayout ?? layoutData

  const cashFlowData = useMemo(() => {
    if (!cashFlowRaw) return []
    return cashFlowRaw.map(({ month, income, expense }) => {
      const [, m] = month.split('-')
      return { month: MONTH_NAMES[(parseInt(m) - 1) % 12], income, expense }
    })
  }, [cashFlowRaw])

  const expenseCategoriesData = useMemo(() => {
    if (!categoryBreakdown) return []
    return categoryBreakdown.slice(0, 7).map((c) => ({ name: c.categoryName, value: c.amount }))
  }, [categoryBreakdown])

  const isLoading = walletLoading || statsLoading
  const monthLabel = getCurrentMonthLabel()

  if (isMobile) {
    return (
      <MobileHome
        stats={stats}
        wallet={wallet}
        isLoading={isLoading}
        greeting={dash?.greeting}
        greetingLoading={dashLoading}
        gamificationData={dash?.gamification as { streak?: number } | undefined}
        scoreData={dash?.score as { score?: number } | undefined}
        transactionsSlot={<RecentTransactionsWidget transactions={recentTxData?.items} isLoading={txLoading} />}
        budgetsSlot={<BudgetsWidget budgets={dash?.budgets} isLoading={dashLoading} monthLabel={monthLabel} />}
        goalsSlot={<GoalsWidget goals={dash?.goals} />}
        insightsSlot={<AiInsights />}
      />
    )
  }

  return (
    <DesktopDashboard
      stats={stats}
      wallet={wallet}
      isLoading={isLoading}
      cashFlowData={cashFlowData}
      categoryData={expenseCategoriesData}
      cashFlowLoading={cashFlowLoading}
      categoryLoading={categoryLoading}
      monthLabel={monthLabel}
      dash={dash ?? undefined}
      dashLoading={dashLoading}
      transactions={recentTxData?.items}
      txLoading={txLoading}
      layout={layout}
      layoutLoading={layoutLoading}
      onLayoutChange={(l) => setOptimisticLayout(l)}
      greetingNode={<SmartGreeting data={dash?.greeting} isLoading={dashLoading} />}
    />
  )
}
