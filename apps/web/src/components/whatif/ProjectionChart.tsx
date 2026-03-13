'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface ProjectionDataPoint {
  month: string
  current: number
  modified: number
}

interface ProjectionChartProps {
  data: ProjectionDataPoint[]
  title?: string
}

function formatRub(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽'
}

export function ProjectionChart({
  data,
  title = 'Прогноз: текущий vs изменённый',
}: ProjectionChartProps) {
  if (!data.length) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Нет данных для построения графика</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl">
      <CardContent className="p-5">
        <h3 className="font-semibold text-sm mb-4">{title}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
              />
              <Tooltip
                formatter={((value: number, name: string) => [
                  formatRub(value),
                  name === 'current' ? 'Текущий' : 'Изменённый',
                ]) as any}
                labelStyle={{ color: '#6b7280' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'current' ? 'Текущий' : 'Изменённый'
                }
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="modified"
                stroke="#007AFF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
