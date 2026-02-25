'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
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

const cashFlowData = [
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

const expenseCategoriesData = [
  { name: 'Продукты', value: 18500 },
  { name: 'Транспорт', value: 8200 },
  { name: 'Кафе и рестораны', value: 12300 },
  { name: 'Развлечения', value: 6800 },
  { name: 'Одежда', value: 9400 },
  { name: 'Коммунальные', value: 7600 },
  { name: 'Другое', value: 12200 },
]

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1',
  '#8b5cf6',
]

const budgets = [
  { category: 'Продукты', spent: 18500, total: 22000 },
  { category: 'Транспорт', spent: 8200, total: 10000 },
  { category: 'Кафе и рестораны', spent: 12300, total: 12000, over: true },
  { category: 'Развлечения', spent: 6800, total: 8000 },
]

const recentTransactions = [
  {
    id: 1,
    date: '25 фев',
    description: 'Перекрёсток',
    category: 'Продукты',
    account: 'Тинькофф',
    amount: -3450,
  },
  {
    id: 2,
    date: '25 фев',
    description: 'Зарплата',
    category: 'Доходы',
    account: 'Сбербанк',
    amount: 107000,
  },
  {
    id: 3,
    date: '24 фев',
    description: 'Яндекс.Такси',
    category: 'Транспорт',
    account: 'Тинькофф',
    amount: -450,
  },
  {
    id: 4,
    date: '24 фев',
    description: 'Кофе Хауз',
    category: 'Кафе и рестораны',
    account: 'Тинькофф',
    amount: -680,
  },
  {
    id: 5,
    date: '23 фев',
    description: 'Netflix',
    category: 'Развлечения',
    account: 'Тинькофф',
    amount: -799,
  },
]

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export default function DashboardPage() {
  const currentMonth = cashFlowData[cashFlowData.length - 1]
  const totalBalance = 287450
  const monthIncome = currentMonth.income
  const monthExpense = currentMonth.expense
  const monthNet = monthIncome - monthExpense

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Обзор</h1>
        <p className="text-muted-foreground text-sm">Февраль 2026</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Общий баланс</CardDescription>
            <CardTitle className="text-2xl">
              {formatAmount(totalBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Wallet className="h-3.5 w-3.5" />
              <span>3 счёта</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Доходы за месяц</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              +{formatAmount(monthIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+17% к прошлому месяцу</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Расходы за месяц</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              -{formatAmount(monthExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>+8% к прошлому месяцу</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Чистый доход</CardDescription>
            <CardTitle className={`text-2xl ${monthNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthNet >= 0 ? '+' : '-'}{formatAmount(monthNet)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Сохранено {Math.round((monthNet / monthIncome) * 100)}%</span>
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
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Расходы по категориям</CardTitle>
            <CardDescription>Февраль 2026</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Budget + Recent transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Budgets */}
        <Card>
          <CardHeader>
            <CardTitle>Бюджеты</CardTitle>
            <CardDescription>Прогресс на февраль</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {budgets.map((budget) => {
              const pct = Math.min(Math.round((budget.spent / budget.total) * 100), 100)
              return (
                <div key={budget.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{budget.category}</span>
                    <span className={`text-xs ${budget.over ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                      {formatAmount(budget.spent)} / {formatAmount(budget.total)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={`h-2 ${budget.over ? '[&>div]:bg-red-500' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pct}% использовано</span>
                    {budget.over ? (
                      <span className="text-red-600">Превышен на {formatAmount(budget.spent - budget.total)}</span>
                    ) : (
                      <span>Остаток {formatAmount(budget.total - budget.spent)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Последние транзакции</CardTitle>
            <CardDescription>5 последних операций</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentTransactions.map((tx, i) => (
                <div key={tx.id}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        {tx.amount > 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : '-'}{formatAmount(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.account}</p>
                    </div>
                  </div>
                  {i < recentTransactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
