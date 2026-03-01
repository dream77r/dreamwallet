'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AiInsights() {
  const { data, isLoading, refetch, isFetching } = trpc.insights.generate.useQuery(
    { period: '1m' },
    { staleTime: 1000 * 60 * 30 }, // Cache 30 min — Claude calls cost money
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI-инсайты
          </CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  )
}
