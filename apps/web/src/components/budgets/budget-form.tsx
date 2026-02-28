'use client'

import { useEffect, useState } from 'react'
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
import { Pencil, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface BudgetData {
  id: string
  categoryId: string
  amount: number | { toNumber?: () => number }
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  alertThreshold: number | null
}

interface BudgetFormProps {
  walletId: string
  initialData?: BudgetData
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function BudgetForm({ walletId, initialData, open: controlledOpen, onOpenChange, onSuccess }: BudgetFormProps) {
  const isEdit = !!initialData
  const isControlled = controlledOpen !== undefined

  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen

  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '')
  const [amount, setAmount] = useState(() => {
    if (!initialData) return ''
    const val = initialData.amount
    return typeof val === 'object' && val.toNumber ? val.toNumber().toString() : String(val)
  })
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>(initialData?.period ?? 'MONTHLY')
  const [alertThreshold, setAlertThreshold] = useState(String(initialData?.alertThreshold ?? 80))

  useEffect(() => {
    if (open && initialData) {
      setCategoryId(initialData.categoryId)
      const val = initialData.amount
      setAmount(typeof val === 'object' && val.toNumber ? val.toNumber().toString() : String(val))
      setPeriod(initialData.period)
      setAlertThreshold(String(initialData.alertThreshold ?? 80))
    }
  }, [open, initialData])

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

  const updateMutation = trpc.budget.update.useMutation({
    onSuccess: () => {
      toast.success('Бюджет обновлён')
      setOpen(false)
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

    const amountNum = parseFloat(amount.replace(',', '.'))
    if (!amountNum || amountNum <= 0) { toast.error('Введите корректную сумму'); return }

    const threshold = Math.min(Math.max(parseInt(alertThreshold) || 80, 1), 100)

    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, amount: amountNum, alertThreshold: threshold })
    } else {
      if (!categoryId) { toast.error('Выберите категорию'); return }
      createMutation.mutate({ walletId, categoryId, amount: amountNum, period, alertThreshold: threshold })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const trigger = isEdit ? (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Pencil className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4" />
      Создать бюджет
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать бюджет' : 'Новый бюджет'}</SheetTitle>
          <SheetDescription>{isEdit ? 'Измените параметры бюджета' : 'Установите лимит расходов по категории'}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Выберите категорию расходов" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2">
              <Label>Период</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                  <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                  <SelectItem value="YEARLY">Ежегодно</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RUB</span>
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
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
