'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const CHART_COLORS = [
  '#667eea', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6',
  '#f97316', '#764ba2', '#06b6d4', '#ef4444', '#a3e635',
]

const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: 'none',
  backgroundColor: 'var(--glass-bg)',
  backdropFilter: 'blur(20px)',
  boxShadow: 'var(--glass-shadow)',
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
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
      <div className="lg:col-span-2 glass-card card-default rounded-2xl p-5">
        <div className="pb-3">
          <p className="text-base font-bold tracking-tight">Денежный поток</p>
          <p className="text-xs text-muted-foreground">Доходы и расходы за 12 месяцев</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-[240px] w-full rounded-xl" />
        ) : cashFlowData.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="text-3xl">📈</span>
            <p className="text-sm">График появится после первых транзакций</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cashFlowData} barCategoryGap="30%">
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#667eea" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#764ba2" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="income" name="Доходы" fill="url(#incomeGrad)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Расходы" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card card-default rounded-2xl p-5">
        <div className="pb-3">
          <p className="text-base font-bold tracking-tight">По категориям</p>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-[240px] w-full rounded-xl" />
        ) : categoryData.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="text-3xl">🥧</span>
            <p className="text-sm text-center">Здесь будет разбивка по категориям</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="42%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, fontWeight: 500 }}>{value}</span>} />
              <Tooltip
                formatter={(value: number | undefined) => value != null ? formatAmount(value) : ''}
                contentStyle={TOOLTIP_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
