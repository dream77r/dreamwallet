'use client'

import type { ChatBlock } from '@dreamwallet/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

const CHART_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#FFD60A']

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-red-500" />
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-green-500" />
  if (trend === 'stable') return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  return null
}

function TextBlockView({ block }: { block: Extract<ChatBlock, { type: 'text' }> }) {
  return <p className="whitespace-pre-wrap text-sm">{block.content}</p>
}

function SummaryBlockView({ block }: { block: Extract<ChatBlock, { type: 'summary' }> }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{block.title}</h4>
      <div className="space-y-1">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{item.value}</span>
              <TrendIcon trend={item.trend} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartBlockView({ block }: { block: Extract<ChatBlock, { type: 'chart' }> }) {
  if (block.chartType === 'pie') {
    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={block.data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={(props: PieLabelRenderProps) =>
                `${String(props.name ?? '')} ${((props.percent as number) * 100).toFixed(0)}%`
              }
              labelLine={false}
              fontSize={11}
            >
              {block.data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${Number(v ?? 0).toLocaleString('ru-RU')} ₽`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={block.data}>
          <XAxis dataKey="label" fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip formatter={(v) => `${Number(v ?? 0).toLocaleString('ru-RU')} ₽`} />
          <Bar dataKey="value" fill="#007AFF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ActionBlockView({ block }: { block: Extract<ChatBlock, { type: 'action' }> }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 flex items-center justify-between">
        <span className="text-sm">{block.label}</span>
        <Button size="sm" variant="outline">Подтвердить</Button>
      </CardContent>
    </Card>
  )
}

function TransactionCreatedView({ block }: { block: Extract<ChatBlock, { type: 'transaction_created' }> }) {
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
      <CardContent className="p-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">
            {block.txType === 'INCOME' ? 'Доход' : 'Расход'}: {block.amount.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-muted-foreground">
            {block.description}{block.category ? ` · ${block.category}` : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function ChatBlockRenderer({ blocks }: { blocks: ChatBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text': return <TextBlockView key={i} block={block} />
          case 'summary': return <SummaryBlockView key={i} block={block} />
          case 'chart': return <ChartBlockView key={i} block={block} />
          case 'action': return <ActionBlockView key={i} block={block} />
          case 'transaction_created': return <TransactionCreatedView key={i} block={block} />
          default: return null
        }
      })}
    </div>
  )
}
