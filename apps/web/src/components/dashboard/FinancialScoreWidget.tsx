'use client'

"use client"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export function FinancialScoreWidget({ data, isLoading }: { data?: { score: number, label: string, savingsScore: number, budgetScore: number, goalScore: number, consistencyScore: number, trend?: number, breakdown?: Array<{ name: string, score: number, max: number, hint: string }> } | null, isLoading?: boolean }) {

  if (isLoading) return <Skeleton className="h-48 w-full" />

  if (!data || data.score === 0) return null

  const score = data.score
  // Цвет дуги: зелёный 85+, жёлтый 70+, оранжевый 50+, красный <50
  const color =
    score >= 85 ? "#22c55e" :
    score >= 70 ? "#eab308" :
    score >= 50 ? "#f97316" : "#ef4444"

  // SVG gauge (полукруг)
  const radius = 54
  const circumference = Math.PI * radius  // полукруг
  const progress = (score / 100) * circumference

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Финансовое здоровье</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gauge */}
        <div className="flex flex-col items-center mb-4">
          <svg width="140" height="80" viewBox="0 0 140 80">
            {/* Background arc */}
            <path
              d="M 14 70 A 56 56 0 0 1 126 70"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d="M 14 70 A 56 56 0 0 1 126 70"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            {/* Score text */}
            <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">
              {score}
            </text>
          </svg>
          <p className="text-sm text-muted-foreground mt-1">{data.label}</p>
          {/* Trend */}
          <div className="flex items-center gap-1 mt-1">
            {(data.trend ?? 0) > 0 ? (
              <><TrendingUp className="h-3.5 w-3.5 text-green-500" /><span className="text-xs text-green-500">+{data.trend ?? 0}%</span></>
            ) : (data.trend ?? 0) < 0 ? (
              <><TrendingDown className="h-3.5 w-3.5 text-red-500" /><span className="text-xs text-red-500">{data.trend ?? 0}%</span></>
            ) : (
              <><Minus className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">без изменений</span></>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          {(data.breakdown ?? []).map((item) => (
            <div key={item.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.score}/{item.max}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.score / item.max) * 100}%`,
                    backgroundColor: item.score === item.max ? "#22c55e" : item.score >= item.max * 0.6 ? "#eab308" : "#ef4444"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
