'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'

export const dynamic = 'force-dynamic'

export default function TaxPage() {
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`)
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [type, setType] = useState<'self_employed' | 'ip_usn_income' | 'ip_usn_income_expense'>('self_employed')

  const { data: report } = trpc.tax.getReport.useQuery({ from, to, type })

  return (
    <div className="space-y-6">
      <PageHeader title="Налоговый отчёт" />

      <div className="glass-card card-default rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">С</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">По</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as any)}
              className="w-full bg-card border border-border rounded-xl p-2 text-sm"
            >
              <option value="self_employed">Самозанятый (НПД 6%)</option>
              <option value="ip_usn_income">ИП УСН Доходы (6%)</option>
              <option value="ip_usn_income_expense">ИП УСН Доходы-Расходы (15%)</option>
            </select>
          </div>
        </div>
      </div>

      {report && (
        <StatCarousel columns={4}>
          <StatCard
            label="Доход"
            value={<span className="text-income">{report.income.toLocaleString('ru-RU')} ₽</span>}
          />
          <StatCard
            label="Расход"
            value={`${report.expense.toLocaleString('ru-RU')} ₽`}
          />
          <StatCard
            label="Ставка"
            value={`${report.taxRate}%`}
          />
          <StatCard
            label="Налог к уплате"
            value={<span className="text-expense">{report.taxAmount.toLocaleString('ru-RU')} ₽</span>}
            className="bg-expense/5"
          />
        </StatCarousel>
      )}
    </div>
  )
}
