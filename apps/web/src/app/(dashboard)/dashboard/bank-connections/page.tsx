'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { Banknote } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function BankConnectionsPage() {
  const { data: connections } = trpc.bankConnection.listConnections.useQuery()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Банковские подключения</h1>

      {!connections?.length && (
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center space-y-3">
            <Banknote className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500">Подключите банк для автоматического импорта транзакций</p>
            <p className="text-sm text-gray-400">Поддерживаются: Точка, Сбер, Тинькофф, Альфа, Salt Edge</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {connections?.map(conn => (
          <Card key={conn.id} className="rounded-3xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{conn.account.name}</p>
                <p className="text-xs text-gray-500">
                  {conn.provider} · {conn.status === 'ACTIVE' ? '🟢 Активно' : conn.status === 'ERROR' ? '🔴 Ошибка' : '⚪ Отключено'}
                </p>
              </div>
              {conn.lastSyncAt && (
                <span className="text-xs text-gray-400">
                  Синхр.: {new Date(conn.lastSyncAt).toLocaleDateString('ru-RU')}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
