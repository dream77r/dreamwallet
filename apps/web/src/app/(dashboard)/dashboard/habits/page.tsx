'use client'

import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'
import { Loader2, TrendingUp, TrendingDown, Minus, RotateCcw, Lightbulb } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

export default function HabitsPage() {
  const { data, isLoading } = trpc.ai.analyzeHabits.useQuery()

  if (isLoading) {
    return (
      <div className="glass-card card-default rounded-2xl flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Анализирую привычки...</span>
      </div>
    )
  }

  const hasData = data && (data.patterns.length > 0 || data.trends.length > 0 || data.recommendations.length > 0)

  if (!hasData) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Привычки" />
        <div className="glass-card card-default rounded-2xl py-12 text-center text-muted-foreground">
          Недостаточно данных для анализа. Нужно минимум 10 транзакций за последние 6 месяцев.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Привычки" />

      <StaggerList className="space-y-6">
        {data.patterns.length > 0 && (
          <StaggerItem>
            <div className="glass-card card-default rounded-2xl">
              <div className="p-6 pb-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <RotateCcw className="h-5 w-5 text-blue-500" />
                  Частые траты
                </h2>
              </div>
              <div className="p-6 pt-4 space-y-3">
                {data.patterns.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.merchant}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{p.avgAmount.toLocaleString('ru-RU')} ₽</p>
                      <p className="text-xs text-muted-foreground">{p.count} раз</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>
        )}

        {data.trends.length > 0 && (
          <StaggerItem>
            <div className="glass-card card-default rounded-2xl">
              <div className="p-6 pb-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Тренды
                </h2>
              </div>
              <div className="p-6 pt-4 flex flex-wrap gap-2">
                {data.trends.map((t, i) => (
                  <Badge
                    key={i}
                    variant={t.direction === 'growing' ? 'destructive' : t.direction === 'shrinking' ? 'default' : 'secondary'}
                    className="flex items-center gap-1 px-3 py-1.5"
                  >
                    {t.direction === 'growing' && <TrendingUp className="h-3 w-3" />}
                    {t.direction === 'shrinking' && <TrendingDown className="h-3 w-3" />}
                    {t.direction === 'stable' && <Minus className="h-3 w-3" />}
                    {t.category} {t.change > 0 ? '+' : ''}{t.change}%
                  </Badge>
                ))}
              </div>
            </div>
          </StaggerItem>
        )}

        {data.recommendations.length > 0 && (
          <StaggerItem>
            <div className="glass-card card-default rounded-2xl">
              <div className="p-6 pb-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Рекомендации
                </h2>
              </div>
              <div className="p-6 pt-4">
                <ul className="space-y-2">
                  {data.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </StaggerItem>
        )}
      </StaggerList>
    </div>
  )
}
