'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Receipt, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function TaxPage() {
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`)
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [type, setType] = useState<'self_employed' | 'ip_usn_income' | 'ip_usn_income_expense'>('self_employed')

  const { data: report } = trpc.tax.getReport.useQuery({ from, to, type })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Налоговый отчёт</h1>

      <Card className="rounded-3xl">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">С</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">По</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border rounded-lg p-2 text-sm">
                <option value="self_employed">Самозанятый (НПД 6%)</option>
                <option value="ip_usn_income">ИП УСН Доходы (6%)</option>
                <option value="ip_usn_income_expense">ИП УСН Доходы-Расходы (15%)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-3xl">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Доход</p>
                <p className="text-xl font-bold text-green-600">{report.income.toLocaleString('ru-RU')} ₽</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Расход</p>
                <p className="text-xl font-bold">{report.expense.toLocaleString('ru-RU')} ₽</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Ставка</p>
                <p className="text-xl font-bold">{report.taxRate}%</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Налог к уплате</p>
                <p className="text-xl font-bold text-red-600">{report.taxAmount.toLocaleString('ru-RU')} ₽</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
