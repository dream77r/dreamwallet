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

const ACCOUNT_TYPES = [
  { value: 'BANK_ACCOUNT', label: 'Банковский счёт' },
  { value: 'CASH', label: 'Наличные' },
  { value: 'SAVINGS', label: 'Накопительный' },
  { value: 'CREDIT_CARD', label: 'Кредитная карта' },
  { value: 'INVESTMENT', label: 'Инвестиции' },
  { value: 'CRYPTO', label: 'Крипто' },
  { value: 'CUSTOM', label: 'Другой' },
] as const

type AccountType = typeof ACCOUNT_TYPES[number]['value']

interface AccountData {
  id: string
  name: string
  type: AccountType
  currency: string
}

interface AccountFormProps {
  walletId: string
  initialData?: AccountData
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function AccountForm({ walletId, initialData, open: controlledOpen, onOpenChange, onSuccess }: AccountFormProps) {
  const isEdit = !!initialData
  const isControlled = controlledOpen !== undefined

  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen

  const [name, setName] = useState(initialData?.name ?? '')
  const [type, setType] = useState<AccountType>(initialData?.type ?? 'BANK_ACCOUNT')
  const [currency, setCurrency] = useState(initialData?.currency ?? 'RUB')
  const [initialBalance, setInitialBalance] = useState('0')

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name)
      setType(initialData.type)
      setCurrency(initialData.currency)
    }
  }, [open, initialData])

  const utils = trpc.useUtils()

  const createMutation = trpc.account.create.useMutation({
    onSuccess: () => {
      toast.success('Счёт добавлен')
      setOpen(false)
      resetForm()
      void utils.account.listAll.invalidate()
      void utils.wallet.get.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  const updateMutation = trpc.account.update.useMutation({
    onSuccess: () => {
      toast.success('Счёт обновлён')
      setOpen(false)
      void utils.account.listAll.invalidate()
      void utils.wallet.get.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  function resetForm() {
    setName('')
    setType('BANK_ACCOUNT')
    setCurrency('RUB')
    setInitialBalance('0')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Введите название счёта'); return }

    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, name: name.trim(), type, currency })
    } else {
      const balance = parseFloat(initialBalance.replace(',', '.')) || 0
      createMutation.mutate({ walletId, name: name.trim(), type, currency, initialBalance: balance })
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
      Добавить счёт
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать счёт' : 'Новый счёт'}</SheetTitle>
          <SheetDescription>{isEdit ? 'Измените данные счёта' : 'Добавьте банковский счёт, наличные или кошелёк'}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              placeholder="Тинькофф Black, Наличные..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Тип счёта</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Валюта</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RUB">RUB — Рубль</SelectItem>
                <SelectItem value="USD">USD — Доллар</SelectItem>
                <SelectItem value="EUR">EUR — Евро</SelectItem>
                <SelectItem value="USDT">USDT — Tether</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>Начальный баланс</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency}</span>
              </div>
              <p className="text-xs text-muted-foreground">Сколько сейчас на счёту</p>
            </div>
          )}

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
