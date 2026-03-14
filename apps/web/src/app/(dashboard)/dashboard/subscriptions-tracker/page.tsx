'use client'

import { useState, useMemo } from 'react'
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
import { CalendarClock, Plus, Pencil, Trash2, TrendingDown, Hash, DollarSign } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'

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
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Редактировать подписку</ResponsiveModalTitle>
        </ResponsiveModalHeader>
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
      </ResponsiveModalContent>
    </ResponsiveModal>
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
      <PageHeader
        title="Подписки"
        description="Трекер активных подписок и регулярных списаний"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить
          </Button>
        }
      />

      {/* Stat cards */}
      {!isLoading && subscriptions.length > 0 && (
        <StatCarousel columns={4}>
          <StatCard label="В МЕСЯЦ" value={formatAmount(totalMonthly)} icon={<TrendingDown className="h-4 w-4" />} />
          <StatCard label="В ГОД" value={formatAmount(totalYearly)} icon={<CalendarClock className="h-4 w-4" />} />
          <StatCard label="ВСЕГО" value={String(subscriptions.length)} icon={<Hash className="h-4 w-4" />} />
          <StatCard label="СРЕДНЯЯ" value={formatAmount(avgPrice)} icon={<DollarSign className="h-4 w-4" />} />
        </StatCarousel>
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
            <div key={i} className="glass-card rounded-2xl p-4">
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
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 && pausedSubs.length === 0 ? (
        /* Empty state */
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center border-dashed py-16 text-muted-foreground">
          <CalendarClock className="mb-3 h-10 w-10" />
          <p className="mb-1 font-medium text-foreground">Нет активных подписок</p>
          <p className="mb-4 text-sm">Добавьте подписку из каталога или вручную</p>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить
          </Button>
        </div>
      ) : (
        /* Grouped subscriptions */
        <StaggerList className="space-y-6">
          {Array.from(grouped.entries()).map(([catKey, { subs, subtotal }]) => {
            const cat = SUBSCRIPTION_CATEGORIES[catKey]
            return (
              <StaggerItem key={catKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {cat.icon} {cat.label} ({subs.length})
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatAmount(subtotal)} / мес
                  </span>
                </div>

                <StaggerList className="space-y-3">
                  {subs.map((sub) => {
                    const days = daysUntil(sub.nextRunAt)
                    const isUrgent = days >= 0 && days < 3
                    const currency = sub.transactions[0]?.account.currency ?? 'RUB'
                    const info = getServiceInfo(sub.name)

                    return (
                      <StaggerItem key={sub.id}>
                        <div className={`glass-card card-interactive rounded-2xl flex items-center gap-4 p-4${isUrgent ? ' border border-expense/30' : ''}`}>
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
                          <div className="shrink-0 text-right font-semibold text-expense">
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
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-expense hover:text-expense">
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
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate({ id: sub.id })}
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </StaggerItem>
                    )
                  })}
                </StaggerList>
              </StaggerItem>
            )
          })}

          {/* Paused */}
          {pausedSubs.length > 0 && (
            <StaggerItem className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                На паузе ({pausedSubs.length})
              </p>
              <StaggerList className="space-y-3">
                {pausedSubs.map((sub) => {
                  const currency = sub.transactions[0]?.account.currency ?? 'RUB'
                  const info = getServiceInfo(sub.name)
                  return (
                    <StaggerItem key={sub.id}>
                      <div className="glass-card rounded-2xl opacity-60 flex items-center gap-4 p-4">
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
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-expense hover:text-expense">
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
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate({ id: sub.id })}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </StaggerItem>
                  )
                })}
              </StaggerList>
            </StaggerItem>
          )}
        </StaggerList>
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
