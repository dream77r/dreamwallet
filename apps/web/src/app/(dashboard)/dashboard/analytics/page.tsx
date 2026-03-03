'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

type Period = '1m' | '3m' | '6m' | '12m'

const periodConfig: Record<Period, { label: string; months: number }> = {
  '1m': { label: 'Этот месяц', months: 1 },
  '3m': { label: '3 месяца', months: 3 },
  '6m': { label: '6 месяцев', months: 6 },
  '12m': { label: 'Год', months: 12 },
}

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#6366f1', '#8b5cf6', '#ec4899',
]

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
    { walletId: walletId!, limit: 10 },
    { enabled: !!walletId }
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
    return topCounterpartiesRaw.map(c => [c.name, c.amount] as [string, number])
  }, [topCounterpartiesRaw])

  const maxCounterparty = topCounterparties.length > 0 ? topCounterparties[0][1] : 0

  const isLoading = !walletId || cashFlowLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Аналитика</h1>
          <p className="text-muted-foreground text-sm">Детальный анализ финансов</p>
        </div>
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'analytics' | 'report')}>
          <TabsList>
            <TabsTrigger value="analytics">Графики</TabsTrigger>
            <TabsTrigger value="report">Отчёт</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mainTab === 'report' && <ReportTab />}

      {mainTab === 'analytics' && <>
        <div className="flex justify-end">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {(Object.entries(periodConfig) as [Period, { label: string }][]).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key}>{cfg.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: 'Доходы', value: totalIncome, color: 'text-green-600',
              change: incomeChange, goodWhenPositive: true,
            },
            {
              label: 'Расходы', value: totalExpense, color: 'text-red-600',
              change: expenseChange, goodWhenPositive: false,
            },
            {
              label: 'Накоплено', value: totalSavings,
              color: totalSavings >= 0 ? 'text-green-600' : 'text-red-600',
              change: null, goodWhenPositive: true,
            },
            {
              label: 'Норма сбережений', value: null, rate: savingsRate,
              color: savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600',
              change: null, goodWhenPositive: true,
            },
          ].map(({ label, value, rate, color, change, goodWhenPositive }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                {isLoading ? <Skeleton className="h-7 w-28" /> : (
                  <p className={`text-xl font-semibold ${color}`}>
                    {value !== null && value !== undefined ? formatAmount(value) : `${rate}%`}
                  </p>
                )}
                {change !== null && change !== undefined && (
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    {change > 0 ? (
                      <><TrendingUp className={`h-3 w-3 ${goodWhenPositive ? 'text-green-600' : 'text-red-500'}`} />
                        <span className={goodWhenPositive ? 'text-green-600' : 'text-red-500'}>+{change}%</span></>
                    ) : change < 0 ? (
                      <><TrendingDown className={`h-3 w-3 ${goodWhenPositive ? 'text-red-500' : 'text-green-600'}`} />
                        <span className={goodWhenPositive ? 'text-red-500' : 'text-green-600'}>{change}%</span></>
                    ) : (
                      <><Minus className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">0%</span></>
                    )}
                    <span className="text-muted-foreground">к пред. периоду</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Income vs Expense chart */}
        <Card>
          <CardHeader>
            <CardTitle>Доходы и расходы</CardTitle>
            <CardDescription>По месяцам за {periodConfig[period].label.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] w-full" /> : chartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                Нет данных за выбранный период
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatK} />
                  <Tooltip formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''} labelStyle={{ fontWeight: 600 }} />
                  <Legend />
                  <Bar dataKey="income" name="Доходы" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Расходы" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Расходы по категориям</CardTitle>
              <CardDescription>Этот месяц vs прошлый месяц</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            <span className={`text-xs ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
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
            </CardContent>
          </Card>

          {/* Savings trend */}
          <Card>
            <CardHeader>
              <CardTitle>Динамика сбережений</CardTitle>
              <CardDescription>Сумма и норма накоплений по месяцам</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[280px] w-full" /> : chartData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                  Нет данных за выбранный период
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="amount" orientation="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatK} />
                    <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={((value: number | undefined, name: string) => { if (value === undefined) return ""; return name === 'Накоплено' ? formatAmount(value as number) : `${value}%`; }) as never} />
                    <Legend />
                    <Line yAxisId="amount" type="monotone" dataKey="savings" name="Накоплено" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="rate" type="monotone" dataKey="savingsRate" name="Норма, %" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top counterparties */}
        {topCounterparties.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Топ контрагентов</CardTitle>
              <CardDescription>Где вы тратите больше всего</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCounterparties.map(([name, amount]) => {
                const pct = maxCounterparty > 0 ? (amount / maxCounterparty) * 100 : 0
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[200px]">{name}</span>
                      <span className="text-sm font-semibold text-red-500">{formatAmount(amount)}</span>
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
            </CardContent>
          </Card>
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
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Нет данных за выбранный месяц
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Доходы</p>
                <p className="text-xl font-semibold text-green-600">{formatAmount(report.income.total)}</p>
                <p className="text-xs text-muted-foreground">{report.income.count} транзакций</p>
              </CardContent>
            </Card>
            <Card className="border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Расходы</p>
                <p className="text-xl font-semibold text-red-600">{formatAmount(report.expense.total)}</p>
                <p className="text-xs text-muted-foreground">{report.expense.count} транзакций</p>
              </CardContent>
            </Card>
            <Card className={report.savings >= 0
              ? 'border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20'
              : 'border-gray-100 bg-gray-50/50 dark:border-gray-900/30 dark:bg-gray-950/20'
            }>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Сбережения</p>
                <p className={`text-xl font-semibold ${report.savings >= 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                  {formatAmount(report.savings)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top-5 categories */}
          {report.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Топ-5 категорий расходов</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}

          {/* Top-5 expenses */}
          {report.topExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Топ-5 крупнейших трат</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.topExpenses.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{tx.description || 'Без описания'}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category?.name ?? 'Без категории'} &middot; {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className="shrink-0 ml-4 font-semibold text-red-600">
                        -{formatAmount(Number(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>)}
    </div>
  )
}
