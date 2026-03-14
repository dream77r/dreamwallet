'use client'

import { trpc } from '@/lib/trpc/client'
import { ArrowUpDown } from 'lucide-react'

const FLAG: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  CNY: '🇨🇳',
  GBP: '🇬🇧',
  TRY: '🇹🇷',
  AED: '🇦🇪',
}

export function CurrencyWidget() {
  const { data: rates, isLoading } = trpc.currency.getRates.useQuery(undefined, {
    staleTime: 30 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-sm animate-pulse">
        <div className="h-5 bg-muted rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!rates?.length) return null

  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-primary text-white">
          <ArrowUpDown className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-[15px]">Курсы валют</h3>
      </div>
      <div className="space-y-2">
        {rates.map((r) => (
          <div key={r.currency} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{FLAG[r.currency] ?? '💱'}</span>
              <span className="text-sm font-medium text-foreground/80">{r.currency}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {r.rate.toFixed(2)} ₽
            </span>
          </div>
        ))}
      </div>
      {rates[0] && (
        <p className="text-[11px] text-muted-foreground mt-3">
          ЦБ РФ на {rates[0].date}
        </p>
      )}
    </div>
  )
}
