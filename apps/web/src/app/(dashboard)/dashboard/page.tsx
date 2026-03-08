'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
import { DashboardCustomizer, DashboardCustomizerSkeleton } from '@/components/dashboard/DashboardCustomizer'
import type { WidgetConfig } from '@/server/routers/dashboard'

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1',
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
      <div className="h-7 w-72 animate-pulse bg-muted rounded" />
      <div className="h-4 w-44 animate-pulse bg-muted rounded" />
    </div>
  )
  if (!data) return <div><h1 className="text-2xl font-semibold">Обзор</h1></div>
  const borderColor = data.status === 'good' ? 'border-l-green-500' : data.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
  return (
    <div className={`border-l-4 pl-3 ${borderColor}`}>
      <p className="text-lg font-semibold leading-snug max-w-xl">{data.message}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Общий баланс</CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <CardTitle className="text-2xl">
              {formatAmount(stats?.totalBalance ?? 0, wallet?.currency)}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Wallet className="h-3.5 w-3.5" />
            {isLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span>{wallet?.accounts.length ?? 0} {wallet?.accounts.length === 1 ? 'счёт' : 'счёта'}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Доходы за месяц</CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <CardTitle className="text-2xl text-green-600">
              +{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Доходы текущего месяца</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Расходы за месяц</CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <CardTitle className="text-2xl text-red-600">
              -{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Расходы текущего месяца</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Чистый доход</CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <CardTitle className={`text-2xl ${(stats?.monthNet ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats?.monthNet ?? 0) >= 0 ? '+' : '-'}{formatAmount(stats?.monthNet ?? 0, wallet?.currency)}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {stats && stats.monthIncome > 0 ? (
              <span>Сохранено {Math.round((stats.monthNet / stats.monthIncome) * 100)}%</span>
            ) : (
              <span>Нет данных</span>
            )}
          </div>
        </CardContent>
      </Card>
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Денежный поток</CardTitle>
          <CardDescription>Доходы и расходы за 12 месяцев</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : cashFlowData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
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
                />
                <Bar dataKey="income" name="Доходы" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Расходы по категориям</CardTitle>
          <CardDescription>{monthLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : categoryData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
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
                  formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                />
                <Tooltip formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Бюджеты</CardTitle>
        <CardDescription>Прогресс на {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : !budgets || budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <PiggyBank className="h-8 w-8" />
            <p className="text-sm">Бюджеты не настроены</p>
          </div>
        ) : (
          budgets.map((budget) => {
            const budgetAmount = Number(budget.amount)
            const over = budget.spentAmount > budgetAmount
            const pct = Math.min(budget.percentage, 100)
            return (
              <div key={budget.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{budget.category.name}</span>
                  <span className={`text-xs ${over ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {formatAmount(budget.spentAmount)} / {formatAmount(budgetAmount)}
                  </span>
                </div>
                <Progress value={pct} className={`h-2 ${over ? '[&>div]:bg-red-500' : ''}`} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pct}% использовано</span>
                  {over ? (
                    <span className="text-red-600">Превышен на {formatAmount(budget.spentAmount - budgetAmount)}</span>
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
    <Card>
      <CardHeader>
        <CardTitle>Последние транзакции</CardTitle>
        <CardDescription>5 последних операций</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !transactions?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8" />
            <p className="text-sm">Нет транзакций</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx, i) => {
              const isIncome = tx.type === 'INCOME'
              const amount = Number(tx.amount)
              const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
              return (
                <div key={tx.id}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isIncome ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {tx.description ?? tx.counterparty ?? (isIncome ? 'Доход' : 'Расход')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category?.name ?? 'Без категории'} · {dateLabel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}{formatAmount(amount, tx.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.account.name}</p>
                    </div>
                  </div>
                  {i < (transactions?.length ?? 0) - 1 && <Separator />}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Финансовые цели</CardTitle>
          <Link href="/dashboard/goals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Все цели →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.slice(0, 3).map((goal) => {
            const current = Number(goal.currentAmount)
            const target = Number(goal.targetAmount)
            const pct = Math.min(100, Math.round((current / target) * 100))
            const color = goal.color ?? '#3B82F6'
            return (
              <div key={goal.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{goal.icon ?? '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pct}% из {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(target)}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
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

  // Dashboard layout
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
      <div key="score" className="grid grid-cols-1 gap-6 sm:grid-cols-1">
        <FinancialScoreWidget data={dash?.score} isLoading={dashLoading} />
      </div>
    ),
    forecast: (
      <div key="forecast" className="grid grid-cols-1 gap-6 sm:grid-cols-1">
        <ForecastWidget data={dash?.forecast} isLoading={dashLoading} />
      </div>
    ),
    networth: (
      <div key="networth" className="grid grid-cols-1 gap-6 sm:grid-cols-1">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <SmartGreeting data={dash?.greeting} isLoading={dashLoading} />
        <div className="flex items-center gap-2">
          {layoutLoading ? (
            <DashboardCustomizerSkeleton />
          ) : layout ? (
            <DashboardCustomizer layout={layout} onLayoutChange={setOptimisticLayout} />
          ) : null}
          <TransactionForm />
        </div>
      </div>

      {/* Dynamic widget rendering */}
      {layoutLoading ? (
        <>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </>
      ) : sortedWidgets ? (
        sortedWidgets
      ) : (
        // Fallback: show all widgets in default order
        <>
          {widgetMap['balance']}
          {widgetMap['cashflow']}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FinancialScoreWidget data={dash?.score} isLoading={dashLoading} />
            <ForecastWidget data={dash?.forecast} isLoading={dashLoading} />
            <MonthComparisonWidget data={dash?.comparison} isLoading={dashLoading} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {widgetMap['budgets']}
            {widgetMap['recent-transactions']}
          </div>
          {widgetMap['goals']}
        </>
      )}

      {/* AI Insights always visible */}
      <AiInsights />
    </div>
  )
}
