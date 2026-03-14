'use client'

import { trpc } from '@/lib/trpc/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AiInsights() {
  const { data, isLoading, refetch, isFetching } = trpc.insights.generate.useQuery(
    { period: '1m' },
    { staleTime: 1000 * 60 * 30 }, // Cache 30 min — Claude calls cost money
  )

  return (
    <div className="glass-card card-default rounded-2xl">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold tracking-tight flex items-center gap-2">
            <span className="animate-pulse-glow flex items-center justify-center w-6 h-6 rounded-lg bg-violet-500/10">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            </span>
            AI-инсайты
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : !data?.insights.length ? (
          <p className="text-sm text-muted-foreground py-2">
            Недостаточно данных для анализа. Добавьте несколько транзакций.
          </p>
        ) : (
          data.insights.map((insight, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-lg leading-none mt-0.5 shrink-0">{insight.emoji}</span>
              <div>
                <p className="text-sm font-medium leading-snug">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
