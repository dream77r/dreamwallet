'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

type Period = '1m' | '3m' | '6m' | '12m'

const allMonthlyData = [
  { month: 'Мар', income: 85000, expense: 62000 },
  { month: 'Апр', income: 92000, expense: 71000 },
  { month: 'Май', income: 78000, expense: 68000 },
  { month: 'Июн', income: 105000, expense: 74000 },
  { month: 'Июл', income: 98000, expense: 80000 },
  { month: 'Авг', income: 112000, expense: 76000 },
  { month: 'Сен', income: 88000, expense: 65000 },
  { month: 'Окт', income: 95000, expense: 72000 },
  { month: 'Ноя', income: 103000, expense: 78000 },
  { month: 'Дек', income: 118000, expense: 82000 },
  { month: 'Янв', income: 91000, expense: 69000 },
  { month: 'Фев', income: 107000, expense: 75000 },
]

const categoryBreakdown = [
  { category: 'Продукты', thisMonth: 18500, lastMonth: 21200, color: 'hsl(var(--chart-1))' },
  { category: 'Транспорт', thisMonth: 8200, lastMonth: 7800, color: 'hsl(var(--chart-2))' },
  { category: 'Кафе и рестораны', thisMonth: 12300, lastMonth: 10900, color: 'hsl(var(--chart-3))' },
  { category: 'Развлечения', thisMonth: 6800, lastMonth: 9100, color: 'hsl(var(--chart-4))' },
  { category: 'Одежда', thisMonth: 4290, lastMonth: 0, color: 'hsl(var(--chart-5))' },
  { category: 'Коммунальные', thisMonth: 7600, lastMonth: 7400, color: '#6366f1' },
  { category: 'Здоровье', thisMonth: 1230, lastMonth: 3400, color: '#8b5cf6' },
  { category: 'Спорт', thisMonth: 3500, lastMonth: 3500, color: '#ec4899' },
]

const savingsData = [
  { month: 'Авг', savings: 36000, savingsRate: 32 },
  { month: 'Сен', savings: 23000, savingsRate: 26 },
  { month: 'Окт', savings: 23000, savingsRate: 24 },
  { month: 'Ноя', savings: 25000, savingsRate: 24 },
  { month: 'Дек', savings: 36000, savingsRate: 31 },
  { month: 'Янв', savings: 22000, savingsRate: 24 },
  { month: 'Фев', savings: 32000, savingsRate: 30 },
]

const periodConfig: Record<Period, { label: string; months: number }> = {
  '1m': { label: 'Этот месяц', months: 1 },
  '3m': { label: '3 месяца', months: 3 },
  '6m': { label: '6 месяцев', months: 6 },
  '12m': { label: 'Год', months: 12 },
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('3m')

  const months = periodConfig[period].months
  const chartData = allMonthlyData.slice(-months)

  const totalIncome = chartData.reduce((s, d) => s + d.income, 0)
  const totalExpense = chartData.reduce((s, d) => s + d.expense, 0)
  const totalSavings = totalIncome - totalExpense
  const savingsRate = Math.round((totalSavings / totalIncome) * 100)

  const prevChartData = allMonthlyData.slice(-months * 2, -months)
  const prevIncome = prevChartData.reduce((s, d) => s + d.income, 0)
  const prevExpense = prevChartData.reduce((s, d) => s + d.expense, 0)

  const incomeChange = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0
  const expenseChange = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0

  const maxCategory = Math.max(...categoryBreakdown.map(c => Math.max(c.thisMonth, c.lastMonth)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Аналитика</h1>
          <p className="text-muted-foreground text-sm">Детальный анализ финансов</p>
        </div>
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
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Доходы</p>
            <p className="text-xl font-semibold text-green-600">{formatAmount(totalIncome)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {incomeChange > 0 ? (
                <><TrendingUp className="h-3 w-3 text-green-600" /><span className="text-green-600">+{incomeChange}%</span></>
              ) : incomeChange < 0 ? (
                <><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-red-500">{incomeChange}%</span></>
              ) : (
                <><Minus className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">0%</span></>
              )}
              <span className="text-muted-foreground">к пред. периоду</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Расходы</p>
            <p className="text-xl font-semibold text-red-600">{formatAmount(totalExpense)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {expenseChange < 0 ? (
                <><TrendingDown className="h-3 w-3 text-green-600" /><span className="text-green-600">{expenseChange}%</span></>
              ) : expenseChange > 0 ? (
                <><TrendingUp className="h-3 w-3 text-red-500" /><span className="text-red-500">+{expenseChange}%</span></>
              ) : (
                <><Minus className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">0%</span></>
              )}
              <span className="text-muted-foreground">к пред. периоду</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Накоплено</p>
            <p className={`text-xl font-semibold ${totalSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(totalSavings)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">За {periodConfig[period].label.toLowerCase()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Норма сбережений</p>
            <p className={`text-xl font-semibold ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {savingsRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {savingsRate >= 20 ? 'Отлично' : savingsRate >= 10 ? 'Нормально' : 'Стоит улучшить'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expense bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Доходы и расходы</CardTitle>
          <CardDescription>По месяцам за выбранный период</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatK} />
              <Tooltip
                formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Bar dataKey="income" name="Доходы" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Расходы" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
            {categoryBreakdown
              .sort((a, b) => b.thisMonth - a.thisMonth)
              .map((cat) => {
                const pct = maxCategory > 0 ? (cat.thisMonth / maxCategory) * 100 : 0
                const change = cat.lastMonth > 0
                  ? Math.round(((cat.thisMonth - cat.lastMonth) / cat.lastMonth) * 100)
                  : null

                return (
                  <div key={cat.category}>
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
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
          </CardContent>
        </Card>

        {/* Savings trend */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика сбережений</CardTitle>
            <CardDescription>Сумма и норма накоплений по месяцам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="amount"
                  orientation="left"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatK}
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  // @ts-expect-error recharts v3 formatter type is overly strict
                  formatter={(value: number, name: string) =>
                    name === 'Накоплено' ? formatAmount(value) : `${value}%`
                  }
                />
                <Legend />
                <Line
                  yAxisId="amount"
                  type="monotone"
                  dataKey="savings"
                  name="Накоплено"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="savingsRate"
                  name="Норма, %"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
