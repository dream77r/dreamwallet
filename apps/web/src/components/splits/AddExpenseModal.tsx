'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type SplitType = 'equal' | 'custom' | 'percent'

interface Participant {
  id: string
  name: string
}

interface AddExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  participants: Participant[]
  onSuccess: () => void
}

export function AddExpenseModal({
  open,
  onOpenChange,
  groupId,
  participants,
  onSuccess,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [customShares, setCustomShares] = useState<Record<string, string>>({})

  const addExpense = trpc.split.addExpense.useMutation({
    onSuccess: () => {
      toast.success('Расход добавлен!')
      resetForm()
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function resetForm() {
    setDescription('')
    setAmount('')
    setPaidById('')
    setSplitType('equal')
    setCustomShares({})
  }

  function handleSubmit() {
    const parsedAmount = parseFloat(amount)
    if (!description.trim() || !parsedAmount || !paidById) {
      toast.error('Заполните все обязательные поля')
      return
    }

    let shares: { participantId: string; amount: number }[] | undefined

    if (splitType === 'custom') {
      shares = participants.map((p) => ({
        participantId: p.id,
        amount: parseFloat(customShares[p.id] || '0'),
      }))
    } else if (splitType === 'percent') {
      shares = participants.map((p) => ({
        participantId: p.id,
        amount: parsedAmount * (parseFloat(customShares[p.id] || '0') / 100),
      }))
    }

    addExpense.mutate({
      groupId,
      description: description.trim(),
      amount: parsedAmount,
      paidById,
      splitType,
      shares,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить расход</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              placeholder="Ужин, такси, продукты..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <Label>Кто оплатил</Label>
            <Select value={paidById} onValueChange={setPaidById}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите участника" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Тип деления</Label>
            <Select value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Поровну</SelectItem>
                <SelectItem value="custom">Указать суммы</SelectItem>
                <SelectItem value="percent">Проценты</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {splitType !== 'equal' && (
            <div className="space-y-2">
              <Label>
                {splitType === 'custom' ? 'Сумма для каждого' : 'Процент для каждого'}
              </Label>
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-24 truncate">{p.name}</span>
                  <Input
                    type="number"
                    min="0"
                    step={splitType === 'custom' ? '0.01' : '1'}
                    placeholder={splitType === 'custom' ? '0 ₽' : '0%'}
                    value={customShares[p.id] ?? ''}
                    onChange={(e) =>
                      setCustomShares((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={addExpense.isPending}>
            {addExpense.isPending ? 'Сохранение...' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
