'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { PageHeader } from '@/components/ui/page-header'
import { ChartContainer, PeriodPills } from '@/components/ui/chart-container'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'

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
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:grid md:grid-cols-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card card-default rounded-2xl p-4 min-w-[160px] flex-shrink-0">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="glass-card card-default rounded-2xl p-4 md:p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-[260px] w-full" />
      </div>
      <div className="glass-card card-default rounded-2xl p-4 md:p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="glass-card card-default rounded-2xl">
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
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
      </div>
    </div>
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
      <PageHeader
        title="Прогноз денежного потока"
        description="На основе ваших регулярных платежей"
        actions={
          <PeriodPills
            periods={[
              { label: '30д', value: '30' },
              { label: '60д', value: '60' },
              { label: '90д', value: '90' },
            ]}
            active={String(days)}
            onChange={(v) => setDays(Number(v) as DayRange)}
          />
        }
      />

      {isLoading ? (
        <ForecastSkeleton />
      ) : !hasEvents ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary cards */}
          <StatCarousel columns={4}>
            <StatCard
              label="Сейчас"
              value={formatAmount(data!.startBalance)}
              icon={<Wallet className="h-4 w-4" />}
            />

            <StatCard
              label="Поступит"
              value={
                <span className="text-income">+{formatAmount(data!.totalIncome)}</span>
              }
              icon={<TrendingUp className="h-4 w-4 text-income" />}
            />

            <StatCard
              label="Уйдёт"
              value={
                <span className="text-expense">-{formatAmount(data!.totalExpense)}</span>
              }
              icon={<TrendingDown className="h-4 w-4 text-expense" />}
            />

            <StatCard
              label={`Через ${days} дней`}
              value={
                <span className={isNegativeEnd ? 'text-expense' : 'text-income'}>
                  {formatAmount(data!.endBalance)}
                  {isNegativeEnd && (
                    <span className="ml-2 text-xs font-normal bg-expense/10 text-expense px-1.5 py-0.5 rounded">
                      Дефицит
                    </span>
                  )}
                </span>
              }
            />
          </StatCarousel>

          {/* Chart */}
          <ChartContainer
            title="Прогноз баланса"
            subtitle={`Динамика на ${days} дней вперёд`}
            height={{ mobile: 220, desktop: 280 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="balanceGradPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.585 0.232 265)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.585 0.232 265)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="balanceGradNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
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
                  contentStyle={{
                    borderRadius: 12,
                    fontSize: 13,
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
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
                  stroke="oklch(0.585 0.232 265)"
                  strokeWidth={2}
                  fill={isNegativeEnd ? 'url(#balanceGradNeg)' : 'url(#balanceGradPos)'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Events timeline */}
          <div className="glass-card card-default rounded-2xl p-4 md:p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Предстоящие платежи
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allEvents.length} событий за {days} дней
              </p>
            </div>

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
                      ev.type === 'INCOME' ? 'bg-income' : 'bg-expense'
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
                        ev.type === 'INCOME' ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {ev.type === 'INCOME' ? '+' : '-'}
                      {formatAmount(ev.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
