'use client'

import { trpc } from '@/lib/trpc/client'
import { Banknote } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default function BankConnectionsPage() {
  const { data: connections } = trpc.bankConnection.listConnections.useQuery()

  return (
    <div className="space-y-6">
      <PageHeader title="Банковские подключения" />

      {!connections?.length && (
        <div className="glass-card card-default rounded-2xl p-8 text-center space-y-3">
          <Banknote className="h-12 w-12 mx-auto text-muted-foreground/70" />
          <p className="text-muted-foreground">Подключите банк для автоматического импорта транзакций</p>
          <p className="text-sm text-muted-foreground/70">Поддерживаются: Точка, Сбер, Тинькофф, Альфа, Salt Edge</p>
        </div>
      )}

      <div className="space-y-3">
        {connections?.map(conn => (
          <div key={conn.id} className="glass-card card-default rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{conn.account.name}</p>
              <p className="text-xs text-muted-foreground">
                {conn.provider} · {conn.status === 'ACTIVE' ? '🟢 Активно' : conn.status === 'ERROR' ? '🔴 Ошибка' : '⚪ Отключено'}
              </p>
            </div>
            {conn.lastSyncAt && (
              <span className="text-xs text-muted-foreground/70">
                Синхр.: {new Date(conn.lastSyncAt).toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
