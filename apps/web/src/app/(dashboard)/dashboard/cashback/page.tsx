'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { PercentCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function CashbackPage() {
  const now = new Date()
  const { data: rules } = trpc.cashback.getRules.useQuery()
  const { data: summary } = trpc.cashback.getSummary.useQuery({ month: now.getMonth() + 1, year: now.getFullYear() })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Кэшбэк</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Начислено</p>
            <p className="text-2xl font-bold text-green-600">{(summary?.total ?? 0).toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Получено</p>
            <p className="text-2xl font-bold">{(summary?.received ?? 0).toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Ожидается</p>
            <p className="text-2xl font-bold text-orange-500">{(summary?.pending ?? 0).toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Правила кэшбэка</h2>
        {!rules?.length && (
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center">
              <PercentCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Добавьте правила кэшбэка для ваших карт</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {rules?.map(rule => (
            <Card key={rule.id} className="rounded-3xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{rule.account.name}</p>
                  <p className="text-xs text-gray-500">
                    {rule.category ? `${rule.category.icon} ${rule.category.name}` : 'Все категории'} — {Number(rule.rate)}%
                  </p>
                </div>
                {rule.maxMonthly && (
                  <span className="text-xs text-gray-400">макс. {Number(rule.maxMonthly)} ₽/мес</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
