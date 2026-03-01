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
import { useMemo } from 'react'
import { TransactionForm } from '@/components/transactions/transaction-form'
import Link from 'next/link'
import { AiInsights } from '@/components/dashboard/ai-insights'

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

export default function DashboardPage() {
  const { start: monthStart, end: monthEnd } = useMemo(() => getCurrentMonthRange(), [])

  // 1. Get personal wallet
  const { data: wallet, isLoading: walletLoading } = trpc.wallet.get.useQuery()

  const walletId = wallet?.id

  // 2. Get stats (requires walletId)
  const { data: stats, isLoading: statsLoading } = trpc.wallet.getStats.useQuery(
    { walletId: walletId!, dateFrom: monthStart, dateTo: monthEnd },
    { enabled: !!walletId }
  )

  // 3. Get cash flow for 12 months
  const { data: cashFlowRaw, isLoading: cashFlowLoading } = trpc.wallet.getCashFlow.useQuery(
    { walletId: walletId!, months: 12 },
    { enabled: !!walletId }
  )

  // 4. Get expense category breakdown
  const { data: categoryBreakdown, isLoading: categoryLoading } = trpc.wallet.getCategoryBreakdown.useQuery(
    { walletId: walletId!, type: 'EXPENSE', dateFrom: monthStart, dateTo: monthEnd },
    { enabled: !!walletId }
  )

  // 5. Get budgets
  const { data: budgets, isLoading: budgetsLoading } = trpc.budget.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  // 6. Get recent transactions
  const { data: goals } = trpc.goals.list.useQuery()

  const { data: recentTxData, isLoading: txLoading } = trpc.transaction.list.useQuery({
    page: 1,
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  })

  // Format cash flow data for chart
  const cashFlowData = useMemo(() => {
    if (!cashFlowRaw) return []
    return cashFlowRaw.map(({ month, income, expense }) => {
      const [, m] = month.split('-')
      return {
        month: MONTH_NAMES[(parseInt(m) - 1) % 12],
        income,
        expense,
      }
    })
  }, [cashFlowRaw])

  // Format category data for pie chart
  const expenseCategoriesData = useMemo(() => {
    if (!categoryBreakdown) return []
    return categoryBreakdown.slice(0, 7).map(c => ({
      name: c.categoryName,
      value: c.amount,
    }))
  }, [categoryBreakdown])

  const isLoading = walletLoading || statsLoading
  const monthLabel = getCurrentMonthLabel()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Обзор</h1>
          <p className="text-muted-foreground text-sm">{monthLabel}</p>
        </div>
        <TransactionForm />
      </div>

      {/* Stat cards */}
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
              {walletLoading ? (
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

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cash flow chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Денежный поток</CardTitle>
            <CardDescription>Доходы и расходы за 12 месяцев</CardDescription>
          </CardHeader>
          <CardContent>
            {cashFlowLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : cashFlowData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
                Нет данных за последние 12 месяцев
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cashFlowData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Расходы по категориям</CardTitle>
            <CardDescription>{monthLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : expenseCategoriesData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
                Нет расходов в этом месяце
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={expenseCategoriesData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseCategoriesData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: 11 }}>{value}</span>
                    )}
                  />
                  <Tooltip formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget + Recent transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Budgets */}
        <Card>
          <CardHeader>
            <CardTitle>Бюджеты</CardTitle>
            <CardDescription>Прогресс на {monthLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {budgetsLoading ? (
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
                const over = budget.spentAmount > budget.amount
                const pct = Math.min(budget.percentage, 100)
                return (
                  <div key={budget.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{budget.category.name}</span>
                      <span className={`text-xs ${over ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {formatAmount(budget.spentAmount)} / {formatAmount(budget.amount)}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-2 ${over ? '[&>div]:bg-red-500' : ''}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{pct}% использовано</span>
                      {over ? (
                        <span className="text-red-600">Превышен на {formatAmount(budget.spentAmount - budget.amount)}</span>
                      ) : (
                        <span>Остаток {formatAmount(budget.amount - budget.spentAmount)}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Последние транзакции</CardTitle>
            <CardDescription>5 последних операций</CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentTxData?.items.length ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <ArrowLeftRight className="h-8 w-8" />
                <p className="text-sm">Нет транзакций</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTxData.items.map((tx, i) => {
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
                              {tx.description || tx.counterparty || (isIncome ? 'Доход' : 'Расход')}
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
                      {i < recentTxData.items.length - 1 && <Separator />}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals widget */}
      {goals && goals.filter(g => !g.isCompleted).length > 0 && (
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
              {goals.filter(g => !g.isCompleted).slice(0, 3).map(goal => {
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
                        <p className="text-xs text-muted-foreground">{pct}% из {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(target)}</p>
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
      )}
      {/* AI Insights */}
      <AiInsights />
    </div>
  )
}
