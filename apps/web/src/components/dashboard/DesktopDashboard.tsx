'use client'

import { BalanceWidget } from './BalanceWidget'
import { CashflowWidget } from './CashflowWidget'
import { BudgetsWidget } from './BudgetsWidget'
import { RecentTransactionsWidget } from './RecentTransactionsWidget'
import { GoalsWidget } from './GoalsWidget'
import { FinancialScoreWidget } from './FinancialScoreWidget'
import { ForecastWidget } from './ForecastWidget'
import { MonthComparisonWidget } from './MonthComparisonWidget'
import { GamificationWidget } from './GamificationWidget'
import { RunwayWidget } from './RunwayWidget'
import { AiInsights } from './ai-insights'
import { GlassCard } from '@/components/ui/glass-card'
import { Skeleton } from '@/components/ui/skeleton'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'
import type { WidgetConfig } from '@/server/routers/dashboard'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'

const DashboardCustomizer = dynamic(() => import('./DashboardCustomizer').then(m => m.DashboardCustomizer), { ssr: false })
const DashboardCustomizerSkeleton = dynamic(() => import('./DashboardCustomizer').then(m => m.DashboardCustomizerSkeleton), { ssr: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashData = Record<string, any> | undefined

interface DesktopDashboardProps {
  stats: { totalBalance: number; monthIncome: number; monthExpense: number; monthNet: number } | undefined
  wallet: { currency: string; accounts: { id: string }[] } | undefined
  isLoading: boolean
  cashFlowData: { month: string; income: number; expense: number }[]
  categoryData: { name: string; value: number }[]
  cashFlowLoading: boolean
  categoryLoading: boolean
  monthLabel: string
  dash: DashData
  dashLoading: boolean
  transactions: Array<{
    id: string; type: string; amount: unknown; description: string | null; counterparty: string | null
    date: Date | string; currency: string; category: { name: string } | null; account: { name: string }
  }> | undefined
  txLoading: boolean
  layout: WidgetConfig[] | null | undefined
  layoutLoading: boolean
  onLayoutChange: (layout: WidgetConfig[]) => void
  greetingNode: ReactNode
}

export function DesktopDashboard({
  stats, wallet, isLoading, cashFlowData, categoryData, cashFlowLoading,
  categoryLoading, monthLabel, dash, dashLoading, transactions, txLoading,
  layout, layoutLoading, onLayoutChange, greetingNode,
}: DesktopDashboardProps) {
  const widgetMap: Record<string, React.ReactNode> = {
    balance: <BalanceWidget key="balance" stats={stats} wallet={wallet} isLoading={isLoading} />,
    cashflow: <CashflowWidget key="cashflow" cashFlowData={cashFlowData} categoryData={categoryData} isLoading={cashFlowLoading || categoryLoading} monthLabel={monthLabel} />,
    score: (
      <GlassCard key="score">
        <FinancialScoreWidget data={dash?.score} isLoading={dashLoading} />
      </GlassCard>
    ),
    forecast: (
      <GlassCard key="forecast">
        <ForecastWidget data={dash?.forecast} isLoading={dashLoading} />
      </GlassCard>
    ),
    networth: (
      <GlassCard key="networth">
        <MonthComparisonWidget data={dash?.comparison} isLoading={dashLoading} />
      </GlassCard>
    ),
    budgets: <BudgetsWidget key="budgets" budgets={dash?.budgets} isLoading={dashLoading} monthLabel={monthLabel} />,
    'recent-transactions': <RecentTransactionsWidget key="recent-transactions" transactions={transactions} isLoading={txLoading} />,
    goals: <GoalsWidget key="goals" goals={dash?.goals} />,
    gamification: <GamificationWidget key="gamification" data={dash?.gamification} isLoading={dashLoading} />,
    runway: <RunwayWidget key="runway" data={dash?.runway} isLoading={dashLoading} />,
  }

  const sortedWidgets = layout
    ? layout.filter((w) => w.enabled).sort((a, b) => a.order - b.order).map((w) => widgetMap[w.id])
    : null

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between gap-4 pb-1">
        {greetingNode}
        <div className="flex items-center gap-2">
          {layoutLoading ? (
            <DashboardCustomizerSkeleton />
          ) : layout ? (
            <DashboardCustomizer layout={layout} onLayoutChange={(l) => onLayoutChange(l as WidgetConfig[])} />
          ) : null}
          <TransactionForm />
        </div>
      </div>

      <OnboardingChecklist />

      {layoutLoading ? (
        <>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </>
      ) : sortedWidgets ? (
        sortedWidgets
      ) : (
        <StaggerList className="space-y-4">
          {/* Row 1: Balance + Score */}
          <StaggerItem>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['balance']}
              </div>
              <div className="col-span-4 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['score']}
              </div>
            </div>
          </StaggerItem>

          {/* Row 2: Cashflow + Forecast */}
          <StaggerItem>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['cashflow']}
              </div>
              <div className="col-span-4 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['forecast']}
              </div>
            </div>
          </StaggerItem>

          {/* Row 3: Recent Transactions + Budgets */}
          <StaggerItem>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['recent-transactions']}
              </div>
              <div className="col-span-6 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['budgets']}
              </div>
            </div>
          </StaggerItem>

          {/* Row 4: Goals (full width) */}
          <StaggerItem>
            <div className="glass-card card-interactive rounded-2xl p-1">
              {widgetMap['goals']}
            </div>
          </StaggerItem>

          {/* Row 5: Gamification + Runway */}
          <StaggerItem>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['gamification']}
              </div>
              <div className="col-span-6 glass-card card-interactive rounded-2xl p-1">
                {widgetMap['runway']}
              </div>
            </div>
          </StaggerItem>
        </StaggerList>
      )}

      <div className="glass-card card-default rounded-2xl p-4 animate-pulse-glow">
        <AiInsights />
      </div>
    </div>
  )
}
