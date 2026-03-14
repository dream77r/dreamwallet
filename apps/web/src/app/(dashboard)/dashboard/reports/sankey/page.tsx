'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SankeyPage() {
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0])
  const [to, setTo] = useState(now.toISOString().split('T')[0])

  const { data } = trpc.reports.getSankeyData.useQuery({ from, to })

  return (
    <div className="space-y-6">
      <PageHeader title="Финансовая диаграмма Санкей" />

      <div className="glass-card card-default rounded-2xl p-5">
        <div className="flex gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">С</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">По</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {data && data.links.length > 0 ? (
        <div className="glass-card card-default rounded-2xl p-5">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3">Потоки денег</h3>
            {data.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground truncate flex-1">{link.source.replace('income_', '').replace('expense_', '')}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground truncate flex-1">{link.target.replace('income_', '').replace('expense_', '')}</span>
                <span className="font-semibold tabular-nums">{link.value.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">Полноценная Sankey-диаграмма появится с пакетом @nivo/sankey</p>
        </div>
      ) : (
        <div className="glass-card card-default rounded-2xl p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Нет данных для выбранного периода</p>
        </div>
      )}
    </div>
  )
}
