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
    score: <FinancialScoreWidget key="score" data={dash?.score} isLoading={dashLoading} />,
    forecast: <ForecastWidget key="forecast" data={dash?.forecast} isLoading={dashLoading} />,
    networth: <MonthComparisonWidget key="networth" data={dash?.comparison} isLoading={dashLoading} />,
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
    <div className="space-y-6 animate-fade-up">
      {/* Header: Greeting + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">{greetingNode}</div>
        <div className="flex items-center gap-2 shrink-0">
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
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      ) : sortedWidgets ? (
        <div className="space-y-4">{sortedWidgets}</div>
      ) : (
        <StaggerList className="space-y-5">
          {/* Hero: Balance — full width gradient */}
          <StaggerItem>
            {widgetMap['balance']}
          </StaggerItem>

          {/* Row 2: 3-column — Score, Forecast, Month Comparison */}
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card card-default rounded-2xl overflow-hidden">
                {widgetMap['score']}
              </div>
              <div className="glass-card card-default rounded-2xl overflow-hidden">
                {widgetMap['forecast']}
              </div>
              <div className="glass-card card-default rounded-2xl overflow-hidden">
                {widgetMap['networth']}
              </div>
            </div>
          </StaggerItem>

          {/* Row 3: Cashflow — full width */}
          <StaggerItem>
            {widgetMap['cashflow']}
          </StaggerItem>

          {/* Row 4: Transactions + Budgets — 2 column */}
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgetMap['recent-transactions']}
              {widgetMap['budgets']}
            </div>
          </StaggerItem>

          {/* Row 5: Goals — full width */}
          <StaggerItem>
            {widgetMap['goals']}
          </StaggerItem>

          {/* Row 6: Gamification + Runway — 2 column */}
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgetMap['gamification']}
              {widgetMap['runway']}
            </div>
          </StaggerItem>

          {/* AI Insights */}
          <StaggerItem>
            <AiInsights />
          </StaggerItem>
        </StaggerList>
      )}
    </div>
  )
}
