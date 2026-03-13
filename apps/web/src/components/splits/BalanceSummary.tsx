'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Scale } from 'lucide-react'
import { toast } from 'sonner'

interface Balance {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

interface BalanceSummaryProps {
  balances: Balance[]
  groupId: string
  onSettle: () => void
}

export function BalanceSummary({ balances, groupId, onSettle }: BalanceSummaryProps) {
  const settleMutation = trpc.split.settlePayment.useMutation({
    onSuccess: () => {
      toast.success('Платёж зафиксирован!')
      onSettle()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  if (!balances.length) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-5 text-center">
          <Scale className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-green-600 font-medium">Все расчёты завершены!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-sm">Кто кому должен</h2>
        </div>
        <div className="space-y-3">
          {balances.map((b, i) => (
            <div
              key={`${b.fromId}-${b.toId}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="truncate font-medium">{b.fromName}</span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate font-medium">{b.toName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold tabular-nums text-red-600">
                  {b.amount.toLocaleString('ru-RU')} ₽
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    settleMutation.mutate({
                      groupId,
                      fromId: b.fromId,
                      toId: b.toId,
                      amount: b.amount,
                    })
                  }
                  disabled={settleMutation.isPending}
                >
                  Оплатить
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
