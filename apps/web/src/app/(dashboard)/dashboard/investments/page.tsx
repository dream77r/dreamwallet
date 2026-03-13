'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { LineChart, TrendingUp, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function InvestmentsPage() {
  const { data: portfolio } = trpc.investments.getPortfolio.useQuery()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Инвестиции</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Стоимость</p>
            <p className="text-2xl font-bold">{(portfolio?.totalValue ?? 0).toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Вложено</p>
            <p className="text-2xl font-bold">{(portfolio?.totalCost ?? 0).toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">P&L</p>
            <p className={`text-2xl font-bold ${(portfolio?.totalPnL ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {(portfolio?.totalPnL ?? 0) >= 0 ? '+' : ''}{(portfolio?.totalPnL ?? 0).toLocaleString('ru-RU')} ₽
            </p>
          </CardContent>
        </Card>
      </div>

      {!portfolio?.positions.length && (
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center">
            <LineChart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Добавьте инвестиционный счёт и позиции</p>
          </CardContent>
        </Card>
      )}

      {portfolio?.positions && portfolio.positions.length > 0 && (
        <div className="space-y-3">
          {portfolio.positions.map((pos: any) => (
            <Card key={pos.id} className="rounded-3xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{pos.ticker}</p>
                  <p className="text-xs text-gray-500">{pos.name ?? ''} · {pos.quantity} шт</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{pos.value.toLocaleString('ru-RU')} ₽</p>
                  <p className={`text-xs flex items-center gap-1 ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {pos.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {pos.pnl >= 0 ? '+' : ''}{pos.pnlPercent}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
