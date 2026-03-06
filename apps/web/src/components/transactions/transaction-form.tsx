'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
  tags?: Array<{ tag: { name: string; color?: string | null } }>
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
    return new Date(initialData.date).toISOString().split('T')[0]
  })
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '')
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags?.map((t) => t.tag.name) ?? []
  )

  useEffect(() => {
    if (open && initialData) {
      setType(initialData.type)
      setAccountId(initialData.accountId)
      const val = initialData.amount
      setAmount(typeof val === 'object' && val.toNumber ? val.toNumber().toString() : String(val))
      setDate(new Date(initialData.date).toISOString().split('T')[0])
      setDescription(initialData.description ?? '')
      setCategoryId(initialData.categoryId ?? '')
      setSelectedTags(initialData.tags?.map((t) => t.tag.name) ?? [])
    }
  }, [open, initialData])

  const utils = trpc.useUtils()
  const { data: accounts } = trpc.account.listAll.useQuery()
  const { data: categories } = trpc.category.list.useQuery(
    { type: type as 'INCOME' | 'EXPENSE' },
    { enabled: type !== 'TRANSFER' }
  )
  const { data: existingTags } = trpc.tags.list.useQuery()

  const createMutation = trpc.transaction.create.useMutation({
    onSuccess: () => {
      toast.success('Транзакция добавлена')
      setOpen(false)
      resetForm()
      void utils.transaction.list.invalidate()
      void utils.wallet.get.invalidate()
      void utils.wallet.getStats.invalidate()
      void utils.tags.list.invalidate()
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
      void utils.tags.list.invalidate()
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
    setSelectedTags([])
    setTagInput('')
  }

  function addTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed || selectedTags.includes(trimmed)) return
    setSelectedTags((prev) => [...prev, trimmed])
    setTagInput('')
  }

  function removeTag(name: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== name))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]!)
    }
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
        tags: selectedTags,
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
        tags: selectedTags,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const trigger = isEdit ? (
    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
  ) : (
    <Button><Plus className="h-4 w-4" />Добавить</Button>
  )

  const suggestionTags = existingTags?.filter(
    (t) => !selectedTags.includes(t.name) && t.name.toLowerCase().includes(tagInput.toLowerCase())
  ).slice(0, 5) ?? []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать транзакцию' : 'Новая транзакция'}</SheetTitle>
          <SheetDescription>{isEdit ? 'Измените данные транзакции' : 'Добавьте доход, расход или перевод'}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Тип */}
          <div className="space-y-2">
            <Label>Тип</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setType(t); setCategoryId('') }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'INCOME' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : t === 'EXPENSE' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}>
                  {t === 'INCOME' ? 'Доход' : t === 'EXPENSE' ? 'Расход' : 'Перевод'}
                </button>
              ))}
            </div>
          </div>

          {/* Счёт */}
          <div className="space-y-2">
            <Label>Счёт</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Выберите счёт" /></SelectTrigger>
              <SelectContent>
                {accounts?.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Сумма */}
          <div className="space-y-2">
            <Label>Сумма</Label>
            <div className="relative">
              <Input type="text" inputMode="decimal" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)} className="pr-12 text-lg font-semibold" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RUB</span>
            </div>
          </div>

          {/* Дата */}
          <div className="space-y-2">
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label>Описание</Label>
            <Input placeholder="Магазин, сервис, контрагент..." value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Категория */}
          {type !== 'TRANSFER' && (
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryId ?? ''} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Без категории" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Теги */}
          <div className="space-y-2">
            <Label>Теги</Label>
            <div className="min-h-9 flex flex-wrap gap-1.5 items-center rounded-md border border-input bg-background px-2 py-1.5 cursor-text"
              onClick={() => document.getElementById('tag-input')?.focus()}>
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                  {tag}
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              <input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={selectedTags.length === 0 ? 'Добавить тег...' : ''}
                className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {/* Подсказки */}
            {tagInput && suggestionTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestionTags.map((t) => (
                  <button key={t.id} type="button" onClick={() => addTag(t.name)}
                    className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Enter или запятая для добавления</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
