'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  PiggyBank,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { trpc } from '@/lib/trpc/client'
import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TransactionForm } from '@/components/transactions/transaction-form'
import Link from 'next/link'
import { AiInsights } from '@/components/dashboard/ai-insights'
import { FinancialScoreWidget } from '@/components/dashboard/FinancialScoreWidget'
import { ForecastWidget } from '@/components/dashboard/ForecastWidget'
import { MonthComparisonWidget } from '@/components/dashboard/MonthComparisonWidget'
import dynamic from 'next/dynamic'
const DashboardCustomizer = dynamic(() => import('@/components/dashboard/DashboardCustomizer').then(m => m.DashboardCustomizer), { ssr: false })
const DashboardCustomizerSkeleton = dynamic(() => import('@/components/dashboard/DashboardCustomizer').then(m => m.DashboardCustomizerSkeleton), { ssr: false })
type WidgetId = 'balance' | 'recent-transactions' | 'budgets' | 'cashflow' | 'score' | 'forecast' | 'networth' | 'goals'
type WidgetConfig = { id: WidgetId; enabled: boolean; order: number }

const CHART_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ef4444', // red
  '#a3e635', // lime
  '#8b5cf6',
]

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

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

function SmartGreeting({ data, isLoading }: { data: { message: string; status: string } | undefined; isLoading: boolean }) {
  if (isLoading) return (
    <div className="space-y-1">
      <div className="h-7 w-72 animate-pulse bg-muted rounded-xl" />
      <div className="h-4 w-44 animate-pulse bg-muted rounded-xl" />
    </div>
  )
  if (!data) return <div><h1 className="text-[28px] font-bold tracking-tight">Обзор</h1></div>
  const borderColor = data.status === 'good' ? 'border-l-[#34C759]' : data.status === 'warning' ? 'border-l-yellow-500' : 'border-l-[#FF3B30]'
  return (
    <div className={`border-l-4 pl-3 ${borderColor}`}>
      <p className="text-[28px] font-bold tracking-tight leading-snug max-w-xl">{data.message}</p>
      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}

// ────────────── Widget components ──────────────

function BalanceWidget({
  stats,
  wallet,
  isLoading,
}: {
  stats: { totalBalance: number; monthIncome: number; monthExpense: number; monthNet: number } | undefined
  wallet: { currency: string; accounts: { id: string }[] } | undefined
  isLoading: boolean
}) {
  return (
    <div className="space-y-3">
      {/* Main balance card — clean white, iOS style */}
      <div className="bg-white rounded-3xl shadow-card p-6 animate-fade-up">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] mb-1">Общий баланс</p>
        {isLoading ? (
          <div className="h-12 w-48 animate-pulse bg-black/[0.06] rounded-xl mb-4" />
        ) : (
          <p className="text-[42px] font-bold tracking-tight text-[#1C1C1E] leading-none mb-4">
            {formatAmount(stats?.totalBalance ?? 0, wallet?.currency)}
          </p>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#34C759]" />
            </div>
            {isLoading ? <div className="h-4 w-20 animate-pulse bg-black/[0.06] rounded" /> : (
              <div>
                <p className="text-[11px] text-[#8E8E93] font-medium">Доходы</p>
                <p className="text-sm font-bold text-[#34C759]">+{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-[#FF3B30]" />
            </div>
            {isLoading ? <div className="h-4 w-20 animate-pulse bg-black/[0.06] rounded" /> : (
              <div>
                <p className="text-[11px] text-[#8E8E93] font-medium">Расходы</p>
                <p className="text-sm font-bold text-[#FF3B30]">-{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}</p>
              </div>
            )}
          </div>
          {stats && stats.monthIncome > 0 && (
            <div className="ml-auto">
              <p className="text-[11px] text-[#8E8E93] font-medium text-right">Сохранено</p>
              <p className="text-sm font-bold text-[#007AFF] text-right">
                {Math.round((stats.monthNet / stats.monthIncome) * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Чистый доход', value: formatAmount(Math.abs(stats?.monthNet ?? 0), wallet?.currency), prefix: (stats?.monthNet ?? 0) >= 0 ? '+' : '-', color: (stats?.monthNet ?? 0) >= 0 ? '#34C759' : '#FF3B30', icon: ArrowLeftRight, bg: (stats?.monthNet ?? 0) >= 0 ? '#34C759' : '#FF3B30' },
          { label: 'Счётов', value: String(wallet?.accounts.length ?? 0), prefix: '', color: '#007AFF', icon: Wallet, bg: '#007AFF' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: stat.bg + '1A' }}>
              <stat.icon className="h-5 w-5" style={{ color: stat.bg }} />
            </div>
            {isLoading ? (
              <div className="h-6 w-16 animate-pulse bg-black/[0.06] rounded mb-1" />
            ) : (
              <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.prefix}{stat.value}</p>
            )}
            <p className="text-xs text-[#8E8E93] font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CashflowWidget({
  cashFlowData,
  categoryData,
  isLoading,
  monthLabel,
}: {
  cashFlowData: { month: string; income: number; expense: number }[]
  categoryData: { name: string; value: number }[]
  isLoading: boolean
  monthLabel: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 bg-white rounded-3xl p-5 shadow-card border-0">
        <div className="pb-2">
          <p className="text-base font-bold tracking-tight">Денежный поток</p>
          <p className="text-xs font-medium text-[#8E8E93]">Доходы и расходы за 12 месяцев</p>
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          ) : cashFlowData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm font-medium">
              Нет данных за последние 12 месяцев
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashFlowData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', backgroundColor: '#ffffff', color: '#1C1C1E' }}
                />
                <Bar dataKey="income" name="Доходы" fill="#34C759" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="#FF3B30" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-card border-0">
        <div className="pb-2">
          <p className="text-base font-bold tracking-tight">Расходы по категориям</p>
          <p className="text-xs font-medium text-[#8E8E93]">{monthLabel}</p>
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          ) : categoryData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm font-medium">
              Нет расходов в этом месяце
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 11, fontWeight: 500 }}>{value}</span>}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', backgroundColor: '#ffffff', color: '#1C1C1E' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function BudgetsWidget({
  budgets,
  isLoading,
  monthLabel,
}: {
  budgets: Array<{ id: string; amount: unknown; spentAmount: number; percentage: number; category: { name: string } }> | undefined
  isLoading: boolean
  monthLabel: string
}) {
  return (
    <Card className="bg-card rounded-2xl shadow-sm border-0 dark:shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold tracking-tight">Бюджеты</CardTitle>
        <CardDescription className="text-xs font-medium text-gray-400">Прогресс на {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))
        ) : !budgets || budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <PiggyBank className="h-8 w-8" />
            <p className="text-sm font-medium">Бюджеты не настроены</p>
          </div>
        ) : (
          budgets.map((budget) => {
            const budgetAmount = Number(budget.amount)
            const over = budget.spentAmount > budgetAmount
            const pct = Math.min(budget.percentage, 100)
            return (
              <div key={budget.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{budget.category.name}</span>
                  <span className={`text-xs font-medium ${over ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {formatAmount(budget.spentAmount)} / {formatAmount(budgetAmount)}
                  </span>
                </div>
                <Progress value={pct} className={`h-2 ${over ? '[&>div]:bg-red-500' : '[&>div]:bg-indigo-500'}`} />
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>{pct}% использовано</span>
                  {over ? (
                    <span className="text-red-500">Превышен на {formatAmount(budget.spentAmount - budgetAmount)}</span>
                  ) : (
                    <span>Остаток {formatAmount(budgetAmount - budget.spentAmount)}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function RecentTransactionsWidget({
  transactions,
  isLoading,
}: {
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
}) {
  return (
    <div className="bg-white rounded-3xl shadow-card border-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-base font-bold tracking-tight">Последние транзакции</p>
        <p className="text-xs font-medium text-[#8E8E93]">5 последних операций</p>
      </div>
      <div>
        {isLoading ? (
          <div className="space-y-3 px-5 pb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !transactions?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground px-5 pb-5">
            <ArrowLeftRight className="h-8 w-8" />
            <p className="text-sm font-medium">Нет транзакций</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'INCOME'
              const amount = Number(tx.amount)
              const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isIncome ? 'bg-[#34C759]/10' : 'bg-[#FF3B30]/10'}`}>
                      {isIncome ? (
                        <ArrowUpRight className="h-5 w-5 text-[#34C759]" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-[#FF3B30]" />
                      )}
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

function GoalsWidget({
  goals,
}: {
  goals: Array<{
    id: string
    name: string
    isCompleted: boolean
    currentAmount: unknown
    targetAmount: unknown
    color: string | null
    icon: string | null
  }> | undefined
}) {
  const active = goals?.filter((g) => !g.isCompleted) ?? []
  if (!active.length) return null

  return (
    <Card className="bg-card rounded-2xl shadow-sm border-0 dark:shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold tracking-tight">Финансовые цели</CardTitle>
          <Link href="/dashboard/goals" className="text-xs font-semibold text-[#007AFF] hover:text-[#007AFF]/80 transition-colors">
            Все цели →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.slice(0, 3).map((goal) => {
            const current = Number(goal.currentAmount)
            const target = Number(goal.targetAmount)
            const pct = Math.min(100, Math.round((current / target) * 100))
            const color = goal.color ?? '#007AFF'
            return (
              <div key={goal.id} className="space-y-2 rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{goal.icon ?? '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{goal.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {pct}% из {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(target)}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────── Main page ──────────────

export default function DashboardPage() {
  const router = useRouter()
  const { start: monthStart, end: monthEnd } = useMemo(() => getCurrentMonthRange(), [])

  const { data: wallet, isLoading: walletLoading } = trpc.wallet.get.useQuery()

  useEffect(() => {
    if (!walletLoading && wallet && wallet.accounts?.length === 0) {
      router.replace('/onboarding')
    }
  }, [walletLoading, wallet, router])

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
    page: 1,
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
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

  const widgetMap: Record<WidgetConfig['id'], React.ReactNode> = {
    balance: (
      <BalanceWidget key="balance" stats={stats} wallet={wallet} isLoading={isLoading} />
    ),
    cashflow: (
      <CashflowWidget
        key="cashflow"
        cashFlowData={cashFlowData}
        categoryData={expenseCategoriesData}
        isLoading={cashFlowLoading || categoryLoading}
        monthLabel={monthLabel}
      />
    ),
    score: (
      <div key="score" className="grid grid-cols-1 gap-4 sm:grid-cols-1">
        <FinancialScoreWidget data={dash?.score} isLoading={dashLoading} />
      </div>
    ),
    forecast: (
      <div key="forecast" className="grid grid-cols-1 gap-4 sm:grid-cols-1">
        <ForecastWidget data={dash?.forecast} isLoading={dashLoading} />
      </div>
    ),
    networth: (
      <div key="networth" className="grid grid-cols-1 gap-4 sm:grid-cols-1">
        <MonthComparisonWidget data={dash?.comparison} isLoading={dashLoading} />
      </div>
    ),
    budgets: (
      <BudgetsWidget key="budgets" budgets={dash?.budgets} isLoading={dashLoading} monthLabel={monthLabel} />
    ),
    'recent-transactions': (
      <RecentTransactionsWidget key="recent-transactions" transactions={recentTxData?.items} isLoading={txLoading} />
    ),
    goals: <GoalsWidget key="goals" goals={dash?.goals} />,
  }

  const sortedWidgets = layout
    ? layout
        .filter((w) => w.enabled)
        .sort((a, b) => a.order - b.order)
        .map((w) => widgetMap[w.id])
    : null

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <SmartGreeting data={dash?.greeting} isLoading={dashLoading} />
        <div className="flex items-center gap-2">
          {layoutLoading ? (
            <DashboardCustomizerSkeleton />
          ) : layout ? (
            <DashboardCustomizer layout={layout} onLayoutChange={setOptimisticLayout} />
          ) : null}
          <div className="hidden md:block">
            <TransactionForm />
          </div>
        </div>
      </div>

      {layoutLoading ? (
        <>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </>
      ) : sortedWidgets ? (
        sortedWidgets
      ) : (
        <>
          {widgetMap['balance']}
          {widgetMap['cashflow']}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FinancialScoreWidget data={dash?.score} isLoading={dashLoading} />
            <ForecastWidget data={dash?.forecast} isLoading={dashLoading} />
            <MonthComparisonWidget data={dash?.comparison} isLoading={dashLoading} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {widgetMap['budgets']}
            {widgetMap['recent-transactions']}
          </div>
          {widgetMap['goals']}
        </>
      )}

      <AiInsights />
    </div>
  )
}
