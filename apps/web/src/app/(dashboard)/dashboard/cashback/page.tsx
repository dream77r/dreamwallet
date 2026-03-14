'use client'

import { trpc } from '@/lib/trpc/client'
import { PercentCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'

export const dynamic = 'force-dynamic'

export default function CashbackPage() {
  const now = new Date()
  const { data: rules } = trpc.cashback.getRules.useQuery()
  const { data: summary } = trpc.cashback.getSummary.useQuery({ month: now.getMonth() + 1, year: now.getFullYear() })

  return (
    <div className="space-y-6">
      <PageHeader title="Кэшбэк" />

      <StatCarousel columns={3}>
        <StatCard
          label="Начислено"
          value={<span className="text-income">{(summary?.total ?? 0).toLocaleString('ru-RU')} ₽</span>}
        />
        <StatCard
          label="Получено"
          value={`${(summary?.received ?? 0).toLocaleString('ru-RU')} ₽`}
        />
        <StatCard
          label="Ожидается"
          value={<span className="text-orange-500">{(summary?.pending ?? 0).toLocaleString('ru-RU')} ₽</span>}
        />
      </StatCarousel>

      <div>
        <h2 className="text-lg font-semibold mb-3">Правила кэшбэка</h2>
        {!rules?.length && (
          <div className="glass-card card-default rounded-2xl p-8 text-center">
            <PercentCircle className="h-12 w-12 mx-auto text-muted-foreground/70 mb-3" />
            <p className="text-muted-foreground">Добавьте правила кэшбэка для ваших карт</p>
          </div>
        )}
        <div className="space-y-3">
          {rules?.map(rule => (
            <div key={rule.id} className="glass-card card-default rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{rule.account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rule.category ? `${rule.category.icon} ${rule.category.name}` : 'Все категории'} — {Number(rule.rate)}%
                </p>
              </div>
              {rule.maxMonthly && (
                <span className="text-xs text-muted-foreground/70">макс. {Number(rule.maxMonthly)} ₽/мес</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
