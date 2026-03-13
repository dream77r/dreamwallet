'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SankeyPage() {
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0])
  const [to, setTo] = useState(now.toISOString().split('T')[0])

  const { data } = trpc.reports.getSankeyData.useQuery({ from, to })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Финансовая диаграмма Санкей</h1>

      <Card className="rounded-3xl">
        <CardContent className="p-5">
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">С</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">По</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {data && data.links.length > 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm mb-3">Потоки денег</h3>
              {data.links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 truncate flex-1">{link.source.replace('income_', '').replace('expense_', '')}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600 truncate flex-1">{link.target.replace('income_', '').replace('expense_', '')}</span>
                  <span className="font-semibold tabular-nums">{link.value.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Полноценная Sankey-диаграмма появится с пакетом @nivo/sankey</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Нет данных для выбранного периода</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
