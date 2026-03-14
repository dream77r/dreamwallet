'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6',
  '#f97316', '#8b5cf6', '#06b6d4', '#ef4444', '#a3e635', '#8b5cf6',
]

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

interface CashflowWidgetProps {
  cashFlowData: { month: string; income: number; expense: number }[]
  categoryData: { name: string; value: number }[]
  isLoading: boolean
  monthLabel: string
}

export function CashflowWidget({ cashFlowData, categoryData, isLoading, monthLabel }: CashflowWidgetProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 bg-card rounded-3xl p-5 shadow-card border-0">
        <div className="pb-2">
          <p className="text-base font-bold tracking-tight">Денежный поток</p>
          <p className="text-xs font-medium text-muted-foreground">Доходы и расходы за 12 месяцев</p>
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          ) : cashFlowData.length === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <span className="text-3xl">📈</span>
              <p className="text-sm font-medium">График появится после первых транзакций</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashFlowData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }}
                />
                <Bar dataKey="income" name="Доходы" fill="#34C759" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="#FF3B30" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card rounded-3xl p-5 shadow-card border-0">
        <div className="pb-2">
          <p className="text-base font-bold tracking-tight">Расходы по категориям</p>
          <p className="text-xs font-medium text-muted-foreground">{monthLabel}</p>
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          ) : categoryData.length === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <span className="text-3xl">🥧</span>
              <p className="text-sm font-medium">Здесь будет разбивка по категориям</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, fontWeight: 500 }}>{value}</span>} />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
