'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, Calendar, Wallet } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { trpc } from '@/lib/trpc/client'
import { format, addDays, addWeeks, addMonths, addYears, isAfter, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale'

type DayRange = 30 | 90

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Конвертация schedule cron → следующие даты
function getOccurrences(schedule: string, from: Date, to: Date): Date[] {
  const dates: Date[] = []
  let cursor = new Date(from)
  cursor.setHours(9, 0, 0, 0)

  // Определяем частоту по cron
  let adder: (d: Date) => Date
  if (schedule === '0 9 * * *') adder = (d) => addDays(d, 1)
  else if (schedule === '0 9 * * 1') adder = (d) => addWeeks(d, 1)
  else if (schedule === '0 9 1 */3 *') adder = (d) => addMonths(d, 3)
  else if (schedule === '0 9 1 1 *') adder = (d) => addYears(d, 1)
  else adder = (d) => addMonths(d, 1) // monthly default

  // Сдвинем начальную точку к следующему периоду
  while (isBefore(cursor, from)) {
    cursor = adder(cursor)
  }

  while (!isAfter(cursor, to)) {
    dates.push(new Date(cursor))
    cursor = adder(cursor)
  }

  return dates
}

export default function ForecastPage() {
  const [days, setDays] = useState<DayRange>(30)

  const { data: wallet } = trpc.wallet.get.useQuery()
  const walletId = wallet?.id

  const { data: accounts, isLoading: accountsLoading } = trpc.account.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  const { data: recurringRules, isLoading: recurringLoading } = trpc.recurring.list.useQuery()

  const isLoading = accountsLoading || recurringLoading

  const currentBalance = useMemo(() => {
    if (!accounts) return 0
    return accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
  }, [accounts])

  // Генерируем события на N дней вперёд
  const { events, chartData, endBalance } = useMemo(() => {
    if (!recurringRules) return { events: [], chartData: [], endBalance: currentBalance }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = addDays(today, days)

    // Собираем все события
    const allEvents: Array<{
      date: Date
      name: string
      amount: number
      type: 'INCOME' | 'EXPENSE'
    }> = []

    for (const rule of recurringRules) {
      if (!rule.isActive) continue
      const occurrences = getOccurrences(rule.schedule, today, endDate)
      for (const date of occurrences) {
        allEvents.push({
          date,
          name: rule.name,
          amount: Number(rule.amount),
          type: rule.type as 'INCOME' | 'EXPENSE',
        })
      }
    }

    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Строим баланс по дням
    const dayMap: Map<string, number> = new Map()
    let runningBalance = currentBalance

    // Инициируем все дни
    for (let i = 0; i <= days; i++) {
      const d = addDays(today, i)
      dayMap.set(format(d, 'yyyy-MM-dd'), 0)
    }

    for (const ev of allEvents) {
      const key = format(ev.date, 'yyyy-MM-dd')
      const delta = ev.type === 'INCOME' ? ev.amount : -ev.amount
      dayMap.set(key, (dayMap.get(key) ?? 0) + delta)
    }

    // Накопительная сумма
    const chartPoints: Array<{ label: string; balance: number }> = []
    const dayEntries = Array.from(dayMap.entries()).sort()

    let balance = currentBalance
    for (const [dateStr, delta] of dayEntries) {
      balance += delta
      const d = new Date(dateStr)
      chartPoints.push({
        label: format(d, 'd MMM', { locale: ru }),
        balance: Math.round(balance),
      })
    }

    runningBalance = balance

    // Фильтруем — показываем каждый N-й день для читаемости
    const step = days === 30 ? 3 : 7
    const filteredChart = chartPoints.filter((_, i) => i % step === 0 || i === chartPoints.length - 1)

    return { events: allEvents, chartData: filteredChart, endBalance: runningBalance }
  }, [recurringRules, currentBalance, days])

  const totalIncome = useMemo(
    () => events.filter((e) => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0),
    [events]
  )
  const totalExpense = useMemo(
    () => events.filter((e) => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0),
    [events]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Прогноз денежного потока</h1>
          <p className="text-muted-foreground text-sm mt-1">На основе ваших регулярных платежей</p>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as DayRange)}>
          <TabsList>
            <TabsTrigger value="30">30 дней</TabsTrigger>
            <TabsTrigger value="90">90 дней</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" /> Текущий баланс
            </CardDescription>
            <CardTitle className="text-xl">
              {isLoading ? <Skeleton className="h-7 w-32" /> : formatAmount(currentBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" /> Поступит за {days} дней
            </CardDescription>
            <CardTitle className="text-xl text-green-600">
              {isLoading ? <Skeleton className="h-7 w-32" /> : `+${formatAmount(totalIncome)}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" /> Уйдёт за {days} дней
            </CardDescription>
            <CardTitle className="text-xl text-red-500">
              {isLoading ? <Skeleton className="h-7 w-32" /> : `-${formatAmount(totalExpense)}`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Прогноз баланса</CardTitle>
          <CardDescription>
            Ожидаемый баланс через {days} дней:{' '}
            <span className={endBalance >= currentBalance ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
              {formatAmount(endBalance)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
              Нет регулярных платежей — добавьте их на странице «Регулярные»
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={((value: number | undefined) => value != null ? [formatAmount(value), 'Баланс'] : '') as never}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  fill="url(#balanceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Events table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Предстоящие платежи
          </CardTitle>
          <CardDescription>{events.length} событий за {days} дней</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет запланированных платежей. Добавьте регулярные платежи →{' '}
              <a href="/dashboard/recurring" className="underline">Регулярные</a>
            </p>
          ) : (
            <div className="divide-y">
              {events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs ${ev.type === 'INCOME' ? 'bg-green-500' : 'bg-red-400'}`}>
                      {ev.type === 'INCOME' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(ev.date, 'd MMMM', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ev.type === 'INCOME' ? 'default' : 'destructive'} className="text-xs">
                      {ev.type === 'INCOME' ? 'Доход' : 'Расход'}
                    </Badge>
                    <span className={`text-sm font-semibold ${ev.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                      {ev.type === 'INCOME' ? '+' : '-'}{formatAmount(ev.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
