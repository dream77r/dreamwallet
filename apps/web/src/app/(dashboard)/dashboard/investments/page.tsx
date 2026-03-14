'use client'

import { trpc } from '@/lib/trpc/client'
import { LineChart, TrendingUp, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'

export const dynamic = 'force-dynamic'

export default function InvestmentsPage() {
  const { data: portfolio } = trpc.investments.getPortfolio.useQuery()

  const pnl = portfolio?.totalPnL ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Инвестиции" />

      <StatCarousel columns={3}>
        <StatCard
          label="Стоимость"
          value={`${(portfolio?.totalValue ?? 0).toLocaleString('ru-RU')} ₽`}
        />
        <StatCard
          label="Вложено"
          value={`${(portfolio?.totalCost ?? 0).toLocaleString('ru-RU')} ₽`}
        />
        <StatCard
          label="P&L"
          value={
            <span className={pnl >= 0 ? 'text-income' : 'text-expense'}>
              {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('ru-RU')} ₽
            </span>
          }
        />
      </StatCarousel>

      {!portfolio?.positions.length && (
        <div className="glass-card card-default rounded-2xl p-8 text-center">
          <LineChart className="h-12 w-12 mx-auto text-muted-foreground/70 mb-3" />
          <p className="text-muted-foreground">Добавьте инвестиционный счёт и позиции</p>
        </div>
      )}

      {portfolio?.positions && portfolio.positions.length > 0 && (
        <div className="space-y-3">
          {portfolio.positions.map((pos: any) => (
            <div key={pos.id} className="glass-card card-interactive rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{pos.ticker}</p>
                <p className="text-xs text-muted-foreground">{pos.name ?? ''} · {pos.quantity} шт</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{pos.value.toLocaleString('ru-RU')} ₽</p>
                <p className={`text-xs flex items-center gap-1 ${pos.pnl >= 0 ? 'text-income' : 'text-expense'}`}>
                  {pos.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {pos.pnl >= 0 ? '+' : ''}{pos.pnlPercent}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
