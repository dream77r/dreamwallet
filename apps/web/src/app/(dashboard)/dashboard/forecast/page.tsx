'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, Calendar, Wallet, AlertTriangle, ArrowUpDown } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts'
import { trpc } from '@/lib/trpc/client'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

type DayRange = 30 | 60 | 90

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return format(parseISO(dateStr), 'd MMM', { locale: ru })
}

// Кастомная точка — красная если баланс < 0
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (payload?.balance < 0) {
    return <Dot cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
  }
  return null
}

// Кастомный тултип
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className={d?.balance < 0 ? 'text-red-500 font-bold' : 'text-foreground'}>
        Баланс: {formatAmount(d?.balance ?? 0)}
      </p>
      {d?.income > 0 && <p className="text-green-600">+{formatAmount(d.income)}</p>}
      {d?.expense > 0 && <p className="text-red-500">−{formatAmount(d.expense)}</p>}
    </div>
  )
}

export default function ForecastPage() {
  const [days, setDays] = useState<DayRange>(30)

  const { data, isLoading } = trpc.cashflow.forecast.useQuery({ days })

  const chartData = useMemo(() => {
    if (!data) return []
    const step = days === 30 ? 2 : days === 60 ? 3 : 5
    return data.forecast
      .filter((_, i) => i % step === 0 || i === data.forecast.length - 1)
      .map((d) => ({
        label: formatDate(d.date),
        balance: d.running_balance,
        income: d.income,
        expense: d.expense,
      }))
  }, [data, days])

  const events = useMemo(() => {
    if (!data) return []
    return data.forecast.flatMap((day) =>
      day.events.map((ev) => ({ ...ev, date: day.date }))
    )
  }, [data])

  const isNegative = (data?.summary.min_balance ?? 0) < 0
  const currentBalance = data?.current_balance ?? 0
  const summary = data?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Прогноз денежного потока</h1>
          <p className="text-muted-foreground text-sm mt-1">На основе ваших регулярных платежей</p>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as DayRange)}>
          <TabsList>
            <TabsTrigger value="30">30 дней</TabsTrigger>
            <TabsTrigger value="60">60 дней</TabsTrigger>
            <TabsTrigger value="90">90 дней</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Warning if min balance < 0 */}
      {!isLoading && isNegative && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Прогнозируемый дефицит{' '}
            <strong>{formatDate(summary!.min_balance_date)}</strong>:{' '}
            <strong>{formatAmount(summary!.min_balance)}</strong>. Проверьте регулярные расходы.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              <TrendingUp className="h-4 w-4 text-green-600" /> Поступит
            </CardDescription>
            <CardTitle className="text-xl text-green-600">
              {isLoading ? <Skeleton className="h-7 w-32" /> : `+${formatAmount(summary?.total_income ?? 0)}`}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" /> Уйдёт
            </CardDescription>
            <CardTitle className="text-xl text-red-500">
              {isLoading ? <Skeleton className="h-7 w-32" /> : `−${formatAmount(summary?.total_expense ?? 0)}`}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangle className={`h-4 w-4 ${isNegative ? 'text-red-500' : 'text-yellow-500'}`} />
              Мин. баланс
            </CardDescription>
            <CardTitle className={`text-xl ${isNegative ? 'text-red-500' : ''}`}>
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <>
                  {formatAmount(summary?.min_balance ?? 0)}
                  {summary?.min_balance_date && (
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      {formatDate(summary.min_balance_date)}
                    </p>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Прогноз баланса</CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                Чистый результат за {days} дней:{' '}
                <span className={`font-semibold ${(summary?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {(summary?.net ?? 0) >= 0 ? '+' : ''}{formatAmount(summary?.net ?? 0)}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
              Нет регулярных платежей — добавьте их на странице{' '}
              <a href="/dashboard/recurring" className="underline ml-1">Регулярные</a>
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
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Нулевая линия */}
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  fill="url(#balanceGrad)"
                  dot={<CustomDot />}
                  activeDot={{ r: 5 }}
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
              Нет запланированных платежей.{' '}
              <a href="/dashboard/recurring" className="underline">Добавьте регулярные →</a>
            </p>
          ) : (
            <div className="divide-y">
              {events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold ${
                        ev.type === 'INCOME' ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    >
                      {ev.type === 'INCOME' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ev.date), 'd MMMM', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={ev.type === 'INCOME' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {ev.type === 'INCOME' ? 'Доход' : 'Расход'}
                    </Badge>
                    <span
                      className={`text-sm font-semibold ${
                        ev.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {ev.type === 'INCOME' ? '+' : '−'}{formatAmount(ev.amount)}
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
