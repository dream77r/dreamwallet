'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarClock, Plus, Pencil, Trash2, CreditCard, TrendingDown, Hash, DollarSign } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { QuickAddDialog } from '@/components/subscriptions/QuickAddDialog'
import {
  SUBSCRIPTION_CATALOG,
  SUBSCRIPTION_CATEGORIES,
  SCHEDULE_OPTIONS,
  normalizeToMonthly,
  type SubscriptionCategoryKey,
} from '@dreamwallet/shared'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Helpers ──────────────────────────────────────────

function formatAmount(amount: number | string | { toString(): string }, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function daysUntil(date: string | Date): number {
  const now = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function getServiceInfo(name: string) {
  const n = name.toLowerCase()
  const match = SUBSCRIPTION_CATALOG.find(s => n.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(n))
  if (match) {
    const cat = SUBSCRIPTION_CATEGORIES[match.categoryKey]
    return { icon: match.icon, categoryKey: match.categoryKey, categoryLabel: cat.label }
  }
  return { icon: '💳', categoryKey: 'other' as SubscriptionCategoryKey, categoryLabel: 'Другое' }
}

function scheduleLabel(schedule: string): string {
  return SCHEDULE_OPTIONS.find(o => o.value === schedule)?.short ?? schedule
}

type SortKey = 'nextRunAt' | 'amount' | 'name'

// ─── Types ──────────────────────────────────────────

interface RecurringRule {
  id: string
  name: string
  amount: { toString(): string } | number | string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  schedule: string
  nextRunAt: string | Date
  isActive: boolean
  reminderDays: number
  transactions: Array<{
    accountId: string
    account: { name: string; currency: string }
  }>
}

// ─── Edit Dialog ──────────────────────────────────────

function EditDialog({
  rule,
  open,
  onOpenChange,
}: {
  rule: RecurringRule
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const utils = trpc.useUtils()
  const [name, setName] = useState(rule.name)
  const [amount, setAmount] = useState(String(rule.amount))
  const [reminderDays, setReminderDays] = useState(rule.reminderDays)

  const updateMutation = trpc.recurring.update.useMutation({
    onSuccess: () => {
      toast.success('Сохранено')
      utils.recurring.list.invalidate()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Редактировать подписку</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate({
              id: rule.id,
              name: name.trim(),
              amount: parseFloat(amount),
              reminderDays,
            })
          }}
          className="space-y-4 pt-1"
        >
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Сумма</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" required />
          </div>
          <div className="space-y-1.5">
            <Label>Напомнить за N дней</Label>
            <Input type="number" value={reminderDays} onChange={(e) => setReminderDays(parseInt(e.target.value) || 0)} min={0} max={30} />
          </div>
          <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ──────────────────────────────────────────

export default function SubscriptionsTrackerPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editRule, setEditRule] = useState<RecurringRule | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('nextRunAt')

  const { data: rules = [], isLoading } = trpc.recurring.list.useQuery()
  const utils = trpc.useUtils()

  const subscriptions = useMemo(
    () => rules.filter(r => r.type === 'EXPENSE' && r.isActive) as RecurringRule[],
    [rules],
  )

  const pausedSubs = useMemo(
    () => rules.filter(r => r.type === 'EXPENSE' && !r.isActive) as RecurringRule[],
    [rules],
  )

  // ─── Stats ────────────────────────────────
  const totalMonthly = useMemo(
    () => subscriptions.reduce((sum, r) => sum + normalizeToMonthly(Number(r.amount), r.schedule), 0),
    [subscriptions],
  )
  const totalYearly = totalMonthly * 12
  const avgPrice = subscriptions.length > 0 ? totalMonthly / subscriptions.length : 0

  // ─── Group by category ────────────────────
  const grouped = useMemo(() => {
    const map = new Map<SubscriptionCategoryKey, { subs: RecurringRule[]; subtotal: number }>()

    for (const sub of subscriptions) {
      const { categoryKey } = getServiceInfo(sub.name)
      if (!map.has(categoryKey)) map.set(categoryKey, { subs: [], subtotal: 0 })
      const entry = map.get(categoryKey)!
      entry.subs.push(sub)
      entry.subtotal += normalizeToMonthly(Number(sub.amount), sub.schedule)
    }

    // Sort subs within each group
    for (const entry of map.values()) {
      entry.subs.sort((a, b) => {
        if (sortBy === 'amount') return Number(b.amount) - Number(a.amount)
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru')
        return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()
      })
    }

    return map
  }, [subscriptions, sortBy])

  // ─── Mutations ────────────────────────────
  const toggleMutation = trpc.recurring.update.useMutation({
    onSuccess: () => utils.recurring.list.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = trpc.recurring.delete.useMutation({
    onSuccess: () => {
      toast.success('Подписка удалена')
      utils.recurring.list.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Подписки</h1>
          <p className="text-sm text-muted-foreground">Трекер активных подписок и регулярных списаний</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Stat cards */}
      {!isLoading && subscriptions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">В месяц</p>
                <p className="text-sm font-semibold">{formatAmount(totalMonthly)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">В год</p>
                <p className="text-sm font-semibold">{formatAmount(totalYearly)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Hash className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Всего</p>
                <p className="text-sm font-semibold">{subscriptions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Средняя</p>
                <p className="text-sm font-semibold">{formatAmount(avgPrice)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sort control */}
      {!isLoading && subscriptions.length > 1 && (
        <div className="flex justify-end">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nextRunAt">По дате списания</SelectItem>
              <SelectItem value="amount">По сумме</SelectItem>
              <SelectItem value="name">По названию</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : subscriptions.length === 0 && pausedSubs.length === 0 ? (
        /* Empty state */
        <Card className="flex flex-col items-center justify-center border-dashed py-16 text-muted-foreground">
          <CalendarClock className="mb-3 h-10 w-10" />
          <p className="mb-1 font-medium text-foreground">Нет активных подписок</p>
          <p className="mb-4 text-sm">Добавьте подписку из каталога или вручную</p>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить
          </Button>
        </Card>
      ) : (
        /* Grouped subscriptions */
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([catKey, { subs, subtotal }]) => {
            const cat = SUBSCRIPTION_CATEGORIES[catKey]
            return (
              <div key={catKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {cat.icon} {cat.label} ({subs.length})
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatAmount(subtotal)} / мес
                  </span>
                </div>

                {subs.map((sub) => {
                  const days = daysUntil(sub.nextRunAt)
                  const isUrgent = days >= 0 && days < 3
                  const currency = sub.transactions[0]?.account.currency ?? 'RUB'
                  const info = getServiceInfo(sub.name)

                  return (
                    <Card key={sub.id} className={isUrgent ? 'border-red-200 dark:border-red-900/50' : ''}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                          {info.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium truncate block">{sub.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{scheduleLabel(sub.schedule)}</span>
                            <span>·</span>
                            <span>след. {formatDate(sub.nextRunAt)}</span>
                            {isUrgent && days >= 0 && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                через {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-semibold text-red-600">
                          -{formatAmount(sub.amount, currency)}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Switch
                            checked={sub.isActive}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: sub.id, isActive: checked })}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRule(sub)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить подписку?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Прошлые транзакции останутся. Новые создаваться не будут.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteMutation.mutate({ id: sub.id })}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })}

          {/* Paused */}
          {pausedSubs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                На паузе ({pausedSubs.length})
              </p>
              {pausedSubs.map((sub) => {
                const currency = sub.transactions[0]?.account.currency ?? 'RUB'
                const info = getServiceInfo(sub.name)
                return (
                  <Card key={sub.id} className="opacity-60">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                        {info.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{sub.name}</span>
                          <Badge variant="secondary" className="text-xs">Пауза</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-semibold text-muted-foreground">
                        {formatAmount(sub.amount, currency)}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Switch
                          checked={false}
                          onCheckedChange={() => toggleMutation.mutate({ id: sub.id, isActive: true })}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить подписку?</AlertDialogTitle>
                              <AlertDialogDescription>Прошлые транзакции останутся.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteMutation.mutate({ id: sub.id })}
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <QuickAddDialog open={addOpen} onOpenChange={setAddOpen} />
      {editRule && (
        <EditDialog
          rule={editRule}
          open={!!editRule}
          onOpenChange={(o) => { if (!o) setEditRule(null) }}
        />
      )}
    </div>
  )
}
