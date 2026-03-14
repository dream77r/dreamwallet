'use client'

import {
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  Shield,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface RunwayWidgetProps {
  data?: {
    currentBalance: number
    dailyBurnRate: number
    daysUntilZero: number | null
    projectedZeroDate: string | null
    trend: 'safe' | 'warning' | 'danger'
  } | null
  isLoading?: boolean
}

function pluralizeDays(n: number): string {
  const abs = Math.abs(n) % 100
  const lastDigit = abs % 10
  if (abs >= 11 && abs <= 19) return 'дней'
  if (lastDigit === 1) return 'день'
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня'
  return 'дней'
}

function formatDate(dateStr: string): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `~${day} ${month} ${year}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function getTrendColor(trend: 'safe' | 'warning' | 'danger', daysUntilZero: number | null): string {
  if (trend === 'safe' && daysUntilZero === null) return '#34C759'
  if (daysUntilZero !== null) {
    if (daysUntilZero > 180) return '#34C759'
    if (daysUntilZero >= 60) return '#FF9500'
    return '#FF3B30'
  }
  return '#34C759'
}

function TrendIcon({ trend, color }: { trend: 'safe' | 'warning' | 'danger'; color: string }) {
  const className = 'w-6 h-6'
  switch (trend) {
    case 'safe':
      return <Shield className={className} style={{ color }} />
    case 'warning':
      return <AlertTriangle className={className} style={{ color }} />
    case 'danger':
      return <AlertCircle className={className} style={{ color }} />
  }
}

export function RunwayWidget({ data, isLoading }: RunwayWidgetProps) {
  return (
    <div className="bg-card rounded-3xl shadow-card p-6 animate-fade-up">
      <p className="text-caption text-muted-foreground mb-4">
        Прогноз баланса
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Недостаточно данных для прогноза</p>
      ) : data.currentBalance <= 0 ? (
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6" style={{ color: '#FF3B30' }} />
          <div>
            <p className="text-lg font-semibold" style={{ color: '#FF3B30' }}>
              Баланс отрицательный
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(data.currentBalance)} ₽
            </p>
          </div>
        </div>
      ) : data.trend === 'safe' && data.daysUntilZero === null ? (
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-6 h-6" style={{ color: '#34C759' }} />
          <div>
            <p className="text-lg font-semibold" style={{ color: '#34C759' }}>
              Безопасно
            </p>
            <p className="text-sm text-muted-foreground">Доходы покрывают расходы</p>
          </div>
        </div>
      ) : data.daysUntilZero !== null ? (
        (() => {
          const color = getTrendColor(data.trend, data.daysUntilZero)
          return (
            <div className="flex items-start gap-3">
              <TrendIcon trend={data.trend} color={color} />
              <div>
                <p className="text-3xl font-bold leading-tight" style={{ color }}>
                  {data.daysUntilZero} {pluralizeDays(data.daysUntilZero)}
                </p>
                {data.projectedZeroDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(data.projectedZeroDate)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Средний расход: {formatCurrency(data.dailyBurnRate)} ₽/день
                </p>
              </div>
            </div>
          )
        })()
      ) : (
        <p className="text-sm text-muted-foreground">Недостаточно данных для прогноза</p>
      )}
    </div>
  )
}
