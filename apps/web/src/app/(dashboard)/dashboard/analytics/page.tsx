'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, Minus, Printer } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { trpc } from '@/lib/trpc/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'
import { ChartContainer, PeriodPills } from '@/components/ui/chart-container'

type Period = '1m' | '3m' | '6m' | '12m'

const periodConfig: Record<Period, { label: string; months: number }> = {
  '1m': { label: 'Этот месяц', months: 1 },
  '3m': { label: '3 месяца', months: 3 },
  '6m': { label: '6 месяцев', months: 6 },
  '12m': { label: 'Год', months: 12 },
}

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const CHART_COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ef4444','#a3e635']

const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: 'none',
  backgroundColor: 'var(--glass-bg)',
  backdropFilter: 'blur(20px)',
  boxShadow: 'var(--glass-shadow)',
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatK(value: number) {
  return `${(value / 1000).toFixed(0)}k`
}

function getCurrentMonthRange() {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    prevEnd: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
  }
}

export default function AnalyticsPage() {
  const [mainTab, setMainTab] = useState<'analytics' | 'report'>('analytics')
  const [period, setPeriod] = useState<Period>('3m')
  const months = periodConfig[period].months

  const { start: monthStart, end: monthEnd, prevStart, prevEnd } = useMemo(() => getCurrentMonthRange(), [])

  const { data: wallet } = trpc.wallet.get.useQuery()
  const walletId = wallet?.id

  // Cash flow for selected period (fetch 12 months max, slice later)
  const { data: cashFlowRaw, isLoading: cashFlowLoading } = trpc.wallet.getCashFlow.useQuery(
    { walletId: walletId!, months: 12 },
    { enabled: !!walletId }
  )

  // Category breakdown this month
  const { data: thisCategoryData } = trpc.wallet.getCategoryBreakdown.useQuery(
    { walletId: walletId!, type: 'EXPENSE', dateFrom: monthStart, dateTo: monthEnd },
    { enabled: !!walletId }
  )

  // Category breakdown last month (for comparison)
  const { data: prevCategoryData } = trpc.wallet.getCategoryBreakdown.useQuery(
    { walletId: walletId!, type: 'EXPENSE', dateFrom: prevStart, dateTo: prevEnd },
    { enabled: !!walletId }
  )

  // Top counterparties
  const { data: topCounterpartiesRaw } = trpc.wallet.getTopCounterparties.useQuery(
    { period: period as '1m' | '3m' },
  )

  // Process cash flow data for chart
  const chartData = useMemo(() => {
    if (!cashFlowRaw) return []
    const sliced = cashFlowRaw.slice(-months)
    return sliced.map(({ month, income, expense }) => {
      const [, m] = month.split('-')
      return {
        month: MONTH_NAMES[(parseInt(m) - 1) % 12],
        income,
        expense,
        savings: income - expense,
        savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      }
    })
  }, [cashFlowRaw, months])

  // Summary stats
  const totalIncome = chartData.reduce((s, d) => s + d.income, 0)
  const totalExpense = chartData.reduce((s, d) => s + d.expense, 0)
  const totalSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0

  // Prev period for comparison
  const prevData = useMemo(() => {
    if (!cashFlowRaw || cashFlowRaw.length < months * 2) return null
    const sliced = cashFlowRaw.slice(-months * 2, -months)
    return {
      income: sliced.reduce((s, d) => s + d.income, 0),
      expense: sliced.reduce((s, d) => s + d.expense, 0),
    }
  }, [cashFlowRaw, months])

  const incomeChange = prevData && prevData.income > 0
    ? Math.round(((totalIncome - prevData.income) / prevData.income) * 100)
    : null
  const expenseChange = prevData && prevData.expense > 0
    ? Math.round(((totalExpense - prevData.expense) / prevData.expense) * 100)
    : null

  // Category breakdown for chart
  const categoryBreakdown = useMemo(() => {
    if (!thisCategoryData) return []
    const prevMap = new Map(prevCategoryData?.map(c => [c.categoryId, c.amount]) ?? [])
    return thisCategoryData.slice(0, 8).map((cat, i) => ({
      id: cat.categoryId,
      category: cat.categoryName,
      thisMonth: cat.amount,
      lastMonth: prevMap.get(cat.categoryId) ?? 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [thisCategoryData, prevCategoryData])

  const maxCategory = categoryBreakdown.length > 0
    ? Math.max(...categoryBreakdown.map(c => Math.max(c.thisMonth, c.lastMonth)))
    : 0

  const topCounterparties = useMemo(() => {
    if (!topCounterpartiesRaw) return []
    return topCounterpartiesRaw.map((c: { name: string; amount: number }) => [c.name, c.amount] as [string, number])
  }, [topCounterpartiesRaw])

  const maxCounterparty = topCounterparties.length > 0 ? topCounterparties[0][1] : 0

  const isLoading = !walletId || cashFlowLoading

  const periodPills = (
    <PeriodPills
      periods={[
        { label: '1М', value: '1m' },
        { label: '3М', value: '3m' },
        { label: '6М', value: '6m' },
        { label: '1Г', value: '12m' },
      ]}
      active={period}
      onChange={(v) => setPeriod(v as Period)}
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Аналитика"
        description="Детальный анализ финансов"
        actions={
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'analytics' | 'report')}>
            <TabsList>
              <TabsTrigger value="analytics">Графики</TabsTrigger>
              <TabsTrigger value="report">Отчёт</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {mainTab === 'report' && <ReportTab />}

      {mainTab === 'analytics' && <>
        <div className="flex justify-end">
          {periodPills}
        </div>

        {/* KPI Summary */}
        <StatCarousel columns={4}>
          {/* Income */}
          <StatCard
            label="Доходы"
            value={
              isLoading
                ? <Skeleton className="h-7 w-28" />
                : <span className="text-income">{formatAmount(totalIncome)}</span>
            }
            trend={incomeChange !== null ? { value: incomeChange, label: 'к пред. периоду' } : undefined}
          />

          {/* Expenses */}
          <StatCard
            label="Расходы"
            value={
              isLoading
                ? <Skeleton className="h-7 w-28" />
                : <span className="text-expense">{formatAmount(totalExpense)}</span>
            }
            trend={
              expenseChange !== null
                ? {
                    value: -expenseChange, // invert so positive expense growth shows as bad (red)
                    label: 'к пред. периоду',
                  }
                : undefined
            }
          />

          {/* Savings */}
          <StatCard
            label="Накоплено"
            value={
              isLoading
                ? <Skeleton className="h-7 w-28" />
                : (
                  <span className={totalSavings >= 0 ? 'text-income' : 'text-expense'}>
                    {formatAmount(totalSavings)}
                  </span>
                )
            }
          />

          {/* Savings rate */}
          <StatCard
            label="Норма сбережений"
            value={
              isLoading
                ? <Skeleton className="h-7 w-16" />
                : (
                  <span className={
                    savingsRate >= 20 ? 'text-income' : savingsRate >= 10 ? 'text-yellow-500' : 'text-expense'
                  }>
                    {savingsRate}%
                  </span>
                )
            }
          />
        </StatCarousel>

        {/* Income vs Expense chart */}
        <ChartContainer
          title="Доходы и расходы"
          subtitle={`По месяцам за ${periodConfig[period].label.toLowerCase()}`}
          height={{ mobile: 220, desktop: 280 }}
        >
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Нет данных за выбранный период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatK} />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend />
                <Bar dataKey="income" name="Доходы" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category breakdown */}
          <div className="glass-card card-default rounded-2xl p-4 md:p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-base">Расходы по категориям</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Этот месяц vs прошлый месяц</p>
            </div>
            <div className="space-y-4">
              {!thisCategoryData ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              ) : categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет расходов в этом месяце</p>
              ) : (
                categoryBreakdown.sort((a, b) => b.thisMonth - a.thisMonth).map((cat) => {
                  const pct = maxCategory > 0 ? (cat.thisMonth / maxCategory) * 100 : 0
                  const change = cat.lastMonth > 0
                    ? Math.round(((cat.thisMonth - cat.lastMonth) / cat.lastMonth) * 100)
                    : null
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {change !== null && (
                            <span className={`text-xs ${change > 0 ? 'text-expense' : change < 0 ? 'text-income' : 'text-muted-foreground'}`}>
                              {change > 0 ? '+' : ''}{change}%
                            </span>
                          )}
                          <span className="text-sm font-semibold w-[90px] text-right">{formatAmount(cat.thisMonth)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Savings trend */}
          <ChartContainer
            title="Динамика сбережений"
            subtitle="Сумма и норма накоплений по месяцам"
            height={{ mobile: 220, desktop: 280 }}
          >
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Нет данных за выбранный период
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="amount" orientation="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatK} />
                  <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={((value: number | undefined, name: string) => {
                      if (value === undefined) return ''
                      return name === 'Накоплено' ? formatAmount(value as number) : `${value}%`
                    }) as never}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend />
                  <Line yAxisId="amount" type="monotone" dataKey="savings" name="Накоплено" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="rate" type="monotone" dataKey="savingsRate" name="Норма, %" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </div>

        {/* Top counterparties */}
        {topCounterparties.length > 0 && (
          <div className="glass-card card-default rounded-2xl p-4 md:p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-base">Топ контрагентов</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Где вы тратите больше всего</p>
            </div>
            <div className="space-y-3">
              {topCounterparties.map(([name, amount]: [string, number]) => {
                const pct = maxCounterparty > 0 ? (amount / maxCounterparty) * 100 : 0
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[200px]">{name}</span>
                      <span className="text-sm font-semibold text-expense">{formatAmount(amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>}
    </div>
  )
}

// ─── Monthly Report Tab ──────────────────────────────────────────────────────

function ReportTab() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: report, isLoading } = trpc.transaction.monthlyReport.useQuery({ year, month })

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 print:hidden">
        <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Распечатать / PDF
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-40" />
        </div>
      ) : !report ? (
        <div className="glass-card card-default rounded-2xl p-8 text-center text-muted-foreground">
          Нет данных за выбранный месяц
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card card-default rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Доходы</p>
              <p className="text-xl font-semibold text-income">{formatAmount(report.income.total)}</p>
              <p className="text-xs text-muted-foreground">{report.income.count} транзакций</p>
            </div>
            <div className="glass-card card-default rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Расходы</p>
              <p className="text-xl font-semibold text-expense">{formatAmount(report.expense.total)}</p>
              <p className="text-xs text-muted-foreground">{report.expense.count} транзакций</p>
            </div>
            <div className="glass-card card-default rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Сбережения</p>
              <p className={`text-xl font-semibold ${report.savings >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatAmount(report.savings)}
              </p>
            </div>
          </div>

          {/* Top-5 categories */}
          {report.byCategory.length > 0 && (
            <div className="glass-card card-default rounded-2xl p-4 md:p-6">
              <h3 className="font-semibold text-base mb-4">Топ-5 категорий расходов</h3>
              <div className="space-y-4">
                {report.byCategory.map((cat, i) => {
                  const maxAmount = report.byCategory[0]?.amount ?? 1
                  const pct = maxAmount > 0 ? Math.round((cat.amount / maxAmount) * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-sm font-medium">{cat.category?.name ?? 'Без категории'}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatAmount(cat.amount)}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top-5 expenses */}
          {report.topExpenses.length > 0 && (
            <div className="glass-card card-default rounded-2xl p-4 md:p-6">
              <h3 className="font-semibold text-base mb-4">Топ-5 крупнейших трат</h3>
              <div className="space-y-3">
                {report.topExpenses.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tx.description || 'Без описания'}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.category?.name ?? 'Без категории'} &middot; {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="shrink-0 ml-4 font-semibold text-expense">
                      -{formatAmount(Number(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
