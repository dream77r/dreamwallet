'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface PayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  memberId: string
  memberName: string
  balance: number
  period: string
  currency?: string
}

export function PayoutDialog({
  open,
  onOpenChange,
  projectId,
  memberId,
  memberName,
  balance,
  period,
  currency = 'RUB',
}: PayoutDialogProps) {
  const [amount, setAmount] = useState(balance > 0 ? balance.toString() : '')
  const [note, setNote] = useState('')
  const utils = trpc.useUtils()

  const mutation = trpc.income.createPayout.useMutation({
    onSuccess: () => {
      void utils.income.getDistribution.invalidate({ projectId, period })
      void utils.income.getPayouts.invalidate({ projectId })
      onOpenChange(false)
      setAmount('')
      setNote('')
    },
  })

  const formatAmount = (val: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Выплата — {memberName}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({
              projectId,
              memberId,
              amount: parseFloat(amount),
              period,
              note: note || undefined,
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Сумма</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {balance > 0 && (
              <p className="text-xs text-muted-foreground">
                Остаток к выплате: {formatAmount(balance)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Примечание</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Необязательно"
              rows={2}
            />
          </div>
          {mutation.error && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Сохранение...' : 'Выплатить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
