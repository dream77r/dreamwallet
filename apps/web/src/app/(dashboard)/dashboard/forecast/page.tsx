'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Wallet, Calendar, Plus } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { trpc } from '@/lib/trpc/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

type DayRange = 30 | 60 | 90

function formatAmount(amount: number, compact = false) {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(amount)
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ForecastSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-7 w-32" /></CardHeader></Card>
        ))}
      </div>
      <Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-[260px] w-full" /></CardContent></Card>
      <Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</CardContent></Card>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-semibold text-lg">Нет регулярных платежей</p>
          <p className="text-sm text-muted-foreground mt-1">
            Добавьте регулярные доходы и расходы, чтобы увидеть прогноз
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recurring">
            <Plus className="h-4 w-4 mr-2" /> Добавить регулярный платёж
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [days, setDays] = useState<DayRange>(30)

  const { data, isLoading } = trpc.forecast.get.useQuery({ days }, {
    staleTime: 5 * 60 * 1000, // 5 min on client
  })

  // Chart: sample every N days for readability
  const step = days === 30 ? 3 : days === 60 ? 5 : 7
  const chartData = data?.daily
    .filter((_, i, arr) => i % step === 0 || i === arr.length - 1)
    .map((d) => ({
      label: format(new Date(d.date), 'd MMM', { locale: ru }),
      balance: d.balance,
    })) ?? []

  const hasEvents = (data?.daily.some((d) => d.events.length > 0)) ?? false
  const allEvents = data?.daily.flatMap((d) => d.events.map((e) => ({ ...e, dateLabel: d.date }))) ?? []
  const isNegativeEnd = (data?.endBalance ?? 0) < 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {isLoading ? (
        <ForecastSkeleton />
      ) : !hasEvents ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" /> Сейчас
                </CardDescription>
                <CardTitle className="text-xl">{formatAmount(data!.startBalance)}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-green-600">
                  <TrendingUp className="h-4 w-4" /> Поступит
                </CardDescription>
                <CardTitle className="text-xl text-green-600">
                  +{formatAmount(data!.totalIncome)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-red-500">
                  <TrendingDown className="h-4 w-4" /> Уйдёт
                </CardDescription>
                <CardTitle className="text-xl text-red-500">
                  -{formatAmount(data!.totalExpense)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Через {days} дней</CardDescription>
                <CardTitle className={`text-xl ${isNegativeEnd ? 'text-red-600' : 'text-green-600'}`}>
                  {formatAmount(data!.endBalance)}
                  {isNegativeEnd && (
                    <span className="ml-2 text-xs font-normal bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      Дефицит
                    </span>
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
                Динамика баланса на {days} дней вперёд
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="balanceGradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="balanceGradNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatAmount(v, true)}
                    width={72}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [formatAmount(value as number), 'Баланс'] as any}
                    labelStyle={{ fontWeight: 600 }}
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  />
                  {/* Zero reference line */}
                  <ReferenceLine
                    y={0}
                    stroke="#ef4444"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: '0', position: 'insideTopLeft', fontSize: 11, fill: '#ef4444' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    fill={isNegativeEnd ? 'url(#balanceGradNeg)' : 'url(#balanceGradPos)'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Events timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Предстоящие платежи
              </CardTitle>
              <CardDescription>{allEvents.length} событий за {days} дней</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop: table rows | Mobile: cards */}
              <div className="divide-y">
                {allEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    {/* Icon */}
                    <div
                      className={`hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${
                        ev.type === 'INCOME' ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    >
                      {ev.type === 'INCOME' ? '↑' : '↓'}
                    </div>

                    {/* Name + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ev.dateLabel), 'd MMMM yyyy', { locale: ru })}
                      </p>
                    </div>

                    {/* Badge + amount */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={ev.type === 'INCOME' ? 'default' : 'destructive'}
                        className="hidden sm:flex text-xs"
                      >
                        {ev.type === 'INCOME' ? 'Доход' : 'Расход'}
                      </Badge>
                      <span
                        className={`text-sm font-semibold ${
                          ev.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {ev.type === 'INCOME' ? '+' : '-'}
                        {formatAmount(ev.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
