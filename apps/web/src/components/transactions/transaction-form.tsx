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

interface TransactionData {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  accountId: string
  amount: number | { toNumber?: () => number }
  date: Date | string
  description?: string | null
  categoryId?: string | null
}

interface TransactionFormProps {
  initialData?: TransactionData
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function TransactionForm({ initialData, open: controlledOpen, onOpenChange, onSuccess }: TransactionFormProps) {
  const isEdit = !!initialData
  const isControlled = controlledOpen !== undefined

  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen

  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>(initialData?.type ?? 'EXPENSE')
  const [accountId, setAccountId] = useState(initialData?.accountId ?? '')
  const [amount, setAmount] = useState(() => {
    if (!initialData) return ''
    const val = initialData.amount
    return typeof val === 'object' && val.toNumber ? val.toNumber().toString() : String(val)
  })
  const [date, setDate] = useState(() => {
    if (!initialData) return new Date().toISOString().split('T')[0]
    const d = new Date(initialData.date)
    return d.toISOString().split('T')[0]
  })
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '')

  useEffect(() => {
    if (open && initialData) {
      setType(initialData.type)
      setAccountId(initialData.accountId)
      const val = initialData.amount
      setAmount(typeof val === 'object' && val.toNumber ? val.toNumber().toString() : String(val))
      setDate(new Date(initialData.date).toISOString().split('T')[0])
      setDescription(initialData.description ?? '')
      setCategoryId(initialData.categoryId ?? '')
    }
  }, [open, initialData])

  const utils = trpc.useUtils()
  const { data: accounts } = trpc.account.listAll.useQuery()
  const { data: categories } = trpc.category.list.useQuery(
    { type: type as 'INCOME' | 'EXPENSE' },
    { enabled: type !== 'TRANSFER' }
  )

  const createMutation = trpc.transaction.create.useMutation({
    onSuccess: () => {
      toast.success('Транзакция добавлена')
      setOpen(false)
      resetForm()
      void utils.transaction.list.invalidate()
      void utils.wallet.get.invalidate()
      void utils.wallet.getStats.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  const updateMutation = trpc.transaction.update.useMutation({
    onSuccess: () => {
      toast.success('Транзакция обновлена')
      setOpen(false)
      void utils.transaction.list.invalidate()
      void utils.wallet.get.invalidate()
      void utils.wallet.getStats.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  function resetForm() {
    setType('EXPENSE')
    setAccountId('')
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setCategoryId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!accountId) { toast.error('Выберите счёт'); return }

    const amountNum = parseFloat(amount.replace(',', '.'))
    if (!amountNum || amountNum <= 0) { toast.error('Введите корректную сумму'); return }

    if (isEdit && initialData) {
      updateMutation.mutate({
        id: initialData.id,
        type,
        accountId,
        amount: amountNum,
        date: new Date(date),
        description: description || undefined,
        categoryId: categoryId || undefined,
      })
    } else {
      createMutation.mutate({
        accountId,
        type,
        amount: amountNum,
        date: new Date(date),
        description: description || undefined,
        categoryId: categoryId || undefined,
        isRecurring: false,
      })
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
      Добавить
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать транзакцию' : 'Новая транзакция'}</SheetTitle>
          <SheetDescription>{isEdit ? 'Измените данные транзакции' : 'Добавьте доход, расход или перевод'}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Тип</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategoryId('') }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'INCOME' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : t === 'EXPENSE' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t === 'INCOME' ? 'Доход' : t === 'EXPENSE' ? 'Расход' : 'Перевод'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Счёт</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите счёт" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Сумма</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-12 text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RUB</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Input
              placeholder="Магазин, сервис, контрагент..."
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {type !== 'TRANSFER' && (
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryId ?? ''} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Без категории" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
