'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingDown, TrendingUp, Wallet, Calendar } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

function formatAmount(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  const balance = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm text-sm">
      <p className="font-medium mb-1">{label ? formatDate(label) : ''}</p>
      <p className={balance < 0 ? 'text-red-600 font-semibold' : 'text-foreground'}>
        Баланс: {formatAmount(balance)}
      </p>
    </div>
  )
}

export default function ForecastPage() {
  const [days, setDays] = useState<30 | 60 | 90>(30)
  const { data, isLoading } = trpc.cashflow.forecast.useQuery({ days })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-64 animate-pulse bg-muted rounded-lg" />
      </div>
    )
  }

  if (!data) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Нет данных для прогноза. Добавьте recurring-платежи.</p>
    </div>
  )

  const { summary, dailyData } = data
  const chartData = dailyData.filter((_, i) => i % (days === 90 ? 3 : 1) === 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Прогноз денежного потока</h1>
          <p className="text-sm text-muted-foreground mt-1">На основе регулярных платежей</p>
        </div>
        <div className="flex gap-2">
          {([30, 60, 90] as const).map((d) => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d} дней
            </Button>
          ))}
        </div>
      </div>

      {/* Дефицит алерт */}
      {summary.deficit && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-950/20">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Возможен дефицит</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">
              Прогнозируемый минимальный баланс {formatAmount(summary.minBalance)}
              {summary.minBalanceDate && ` (около ${formatDate(summary.minBalanceDate)})`}
            </p>
          </div>
        </div>
      )}

      {/* Карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="h-4 w-4" />
              <span className="text-xs">Текущий баланс</span>
            </div>
            <p className="text-xl font-bold">{formatAmount(data.currentBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs">Ожидаемые доходы</span>
            </div>
            <p className="text-xl font-bold text-green-600">+{formatAmount(summary.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs">Ожидаемые расходы</span>
            </div>
            <p className="text-xl font-bold text-red-600">-{formatAmount(summary.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Баланс через {days} дней</span>
            </div>
            <p className={`text-xl font-bold ${summary.endBalance < 0 ? 'text-red-600' : 'text-foreground'}`}>
              {formatAmount(summary.endBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* График */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Прогноз баланса</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#2563EB"
                strokeWidth={2}
                dot={(props: { cx: number; cy: number; payload: { balance: number } }) =>
                  props.payload.balance < 0
                    ? <circle key={`${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} r={3} fill="#ef4444" stroke="#ef4444" />
                    : <circle key={`${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} r={2} fill="#2563EB" stroke="#2563EB" fillOpacity={0.4} />
                }
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Список ближайших платежей */}
      {dailyData.some((d) => d.income > 0 || d.expense > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ближайшие платежи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyData
                .filter((d) => d.income > 0 || d.expense > 0)
                .slice(0, 10)
                .map((d) => (
                  <div key={d.date} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{formatDate(d.date)}</span>
                    <div className="flex gap-4">
                      {d.income > 0 && <span className="text-green-600 font-medium">+{formatAmount(d.income)}</span>}
                      {d.expense > 0 && <span className="text-red-600 font-medium">-{formatAmount(d.expense)}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
