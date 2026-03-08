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
type WidgetId = 'balance' | 'recent-transactions' | 'budgets' | 'cashflow' | 'score' | 'forecast' | 'networth' | 'goals'
type WidgetConfig = { id: WidgetId; enabled: boolean; order: number }

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
      <div className="h-7 w-72 animate-pulse bg-muted rounded-xl" />
      <div className="h-4 w-44 animate-pulse bg-muted rounded-xl" />
    </div>
  )
  if (!data) return <div><h1 className="text-2xl font-bold tracking-tight">Обзор</h1></div>
  const borderColor = data.status === 'good' ? 'border-l-green-500' : data.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
  return (
    <div className={`border-l-4 pl-3 ${borderColor}`}>
      <p className="text-lg font-bold tracking-tight leading-snug max-w-xl">{data.message}</p>
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Главная карточка — баланс */}
      <Card className="bg-white rounded-2xl shadow-sm border-0 sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Общий баланс</p>
          {isLoading ? (
            <Skeleton className="h-10 w-36 rounded-xl" />
          ) : (
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              {formatAmount(stats?.totalBalance ?? 0, wallet?.currency)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Wallet className="h-4 w-4" />
            {isLoading ? (
              <Skeleton className="h-4 w-16 rounded" />
            ) : (
              <span className="font-medium">{wallet?.accounts.length ?? 0} {wallet?.accounts.length === 1 ? 'счёт' : 'счёта'}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-2xl shadow-sm border-0">
        <CardHeader className="pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Доходы</p>
          {isLoading ? (
            <Skeleton className="h-8 w-36 rounded-xl" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-green-600">
              +{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            <span>За этот месяц</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-2xl shadow-sm border-0">
        <CardHeader className="pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Расходы</p>
          {isLoading ? (
            <Skeleton className="h-8 w-36 rounded-xl" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-red-500">
              -{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
            <TrendingDown className="h-4 w-4" />
            <span>За этот месяц</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-2xl shadow-sm border-0">
        <CardHeader className="pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Чистый доход</p>
          {isLoading ? (
            <Skeleton className="h-8 w-36 rounded-xl" />
          ) : (
            <p className={`text-2xl font-bold tabular-nums ${(stats?.monthNet ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {(stats?.monthNet ?? 0) >= 0 ? '+' : '-'}{formatAmount(stats?.monthNet ?? 0, wallet?.currency)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
            <ArrowLeftRight className="h-4 w-4" />
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 bg-white rounded-2xl shadow-sm border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold tracking-tight">Денежный поток</CardTitle>
          <CardDescription className="text-xs font-medium text-gray-400">Доходы и расходы за 12 месяцев</CardDescription>
        </CardHeader>
        <CardContent>
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
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="income" name="Доходы" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-2xl shadow-sm border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold tracking-tight">Расходы по категориям</CardTitle>
          <CardDescription className="text-xs font-medium text-gray-400">{monthLabel}</CardDescription>
        </CardHeader>
        <CardContent>
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
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                />
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
    <Card className="bg-white rounded-2xl shadow-sm border-0">
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
    <Card className="bg-white rounded-2xl shadow-sm border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold tracking-tight">Последние транзакции</CardTitle>
        <CardDescription className="text-xs font-medium text-gray-400">5 последних операций</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !transactions?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8" />
            <p className="text-sm font-medium">Нет транзакций</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx, i) => {
              const isIncome = tx.type === 'INCOME'
              const amount = Number(tx.amount)
              const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
              return (
                <div key={tx.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isIncome ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isIncome ? (
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-500" />
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
                      <p className={`text-sm font-bold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatAmount(amount, tx.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">{tx.account.name}</p>
                    </div>
                  </div>
                  {i < (transactions?.length ?? 0) - 1 && <Separator className="bg-gray-50" />}
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
    <Card className="bg-white rounded-2xl shadow-sm border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold tracking-tight">Финансовые цели</CardTitle>
          <Link href="/dashboard/goals" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
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
            const color = goal.color ?? '#6366f1'
            return (
              <div key={goal.id} className="space-y-2 rounded-2xl bg-gray-50 p-4">
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
