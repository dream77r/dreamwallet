'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface BudgetFormProps {
  walletId: string
  onSuccess?: () => void
}

export function BudgetForm({ walletId, onSuccess }: BudgetFormProps) {
  const [open, setOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [alertThreshold, setAlertThreshold] = useState('80')

  const utils = trpc.useUtils()

  const { data: categories } = trpc.category.list.useQuery({ type: 'EXPENSE' })

  const createMutation = trpc.budget.create.useMutation({
    onSuccess: () => {
      toast.success('Бюджет создан')
      setOpen(false)
      resetForm()
      void utils.budget.list.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  function resetForm() {
    setCategoryId('')
    setAmount('')
    setPeriod('MONTHLY')
    setAlertThreshold('80')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) { toast.error('Выберите категорию'); return }

    const amountNum = parseFloat(amount.replace(',', '.'))
    if (!amountNum || amountNum <= 0) { toast.error('Введите корректную сумму'); return }

    const threshold = parseInt(alertThreshold) || 80

    createMutation.mutate({
      walletId,
      categoryId,
      amount: amountNum,
      period,
      alertThreshold: Math.min(Math.max(threshold, 1), 100),
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Создать бюджет
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Новый бюджет</SheetTitle>
          <SheetDescription>Установите лимит расходов по категории</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию расходов" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Период</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                <SelectItem value="YEARLY">Ежегодно</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Лимит</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-12 text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RUB
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Уведомлять при достижении (%)</Label>
            <div className="relative">
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="80"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Получите уведомление, когда потрачено {alertThreshold}% бюджета</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Сохранение...' : 'Создать'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
