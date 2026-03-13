'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  SUBSCRIPTION_CATALOG,
  SUBSCRIPTION_CATEGORIES,
  SCHEDULE_OPTIONS,
  type ScheduleValue,
  type SubscriptionCategoryKey,
} from '@dreamwallet/shared'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const utils = trpc.useUtils()
  const { data: accounts = [] } = trpc.account.listAll.useQuery()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [schedule, setSchedule] = useState<ScheduleValue>('0 9 1 * *')
  const [accountId, setAccountId] = useState('')
  const [reminderDays, setReminderDays] = useState(3)

  const createMutation = trpc.recurring.create.useMutation({
    onSuccess: () => {
      toast.success('Подписка добавлена')
      utils.recurring.list.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (e) => toast.error(e.message),
  })

  function resetForm() {
    setName('')
    setAmount('')
    setSchedule('0 9 1 * *')
    setAccountId('')
    setReminderDays(3)
  }

  function selectFromCatalog(item: typeof SUBSCRIPTION_CATALOG[number]) {
    setName(item.name)
    setAmount(String(item.defaultAmount))
    setSchedule(item.schedule)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !amount) return
    if (!accountId) { toast.error('Выберите счёт'); return }

    createMutation.mutate({
      name: name.trim(),
      amount: parseFloat(amount),
      type: 'EXPENSE',
      accountId,
      schedule,
      reminderDays,
    })
  }

  // Group catalog by category
  const grouped = Object.entries(SUBSCRIPTION_CATEGORIES).map(([key, cat]) => ({
    ...cat,
    items: SUBSCRIPTION_CATALOG.filter(s => s.categoryKey === key),
  })).filter(g => g.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить подписку</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="catalog" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="catalog" className="flex-1">Каталог</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Вручную</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4 mt-3">
            {grouped.map((group) => (
              <div key={group.key}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {group.icon} {group.label}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors hover:bg-accent ${
                        name === item.name ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => selectFromCatalog(item)}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-xs font-medium leading-tight">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Form after catalog selection */}
            {name && (
              <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <span className="text-xl">{SUBSCRIPTION_CATALOG.find(s => s.name === name)?.icon ?? '💳'}</span>
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-muted-foreground">{amount} ₽ / мес</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Сумма</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Напомнить за</Label>
                    <Input
                      type="number"
                      value={reminderDays}
                      onChange={(e) => setReminderDays(parseInt(e.target.value) || 0)}
                      min={0}
                      max={30}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Счёт</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите счёт" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Расписание</Label>
                  <Select value={schedule} onValueChange={(v) => setSchedule(v as ScheduleValue)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Добавление...' : 'Добавить подписку'}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Название *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Netflix"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Сумма *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Счёт *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Расписание</Label>
                <Select value={schedule} onValueChange={(v) => setSchedule(v as ScheduleValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Напомнить за N дней</Label>
                <Input
                  type="number"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(parseInt(e.target.value) || 0)}
                  min={0}
                  max={30}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Добавление...' : 'Добавить подписку'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
