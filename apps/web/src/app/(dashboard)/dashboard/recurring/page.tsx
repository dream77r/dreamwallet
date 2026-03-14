'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
import { Repeat2, Pencil, Trash2, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'

// ─── Types ──────────────────────────────────────────────────────────────────

type ScheduleValue = '0 9 * * *' | '0 9 * * 1' | '0 9 1 * *' | '0 9 1 */3 *' | '0 9 1 1 *'
type TxType = 'INCOME' | 'EXPENSE'

const SCHEDULE_OPTIONS: { value: ScheduleValue; label: string; short: string }[] = [
  { value: '0 9 * * *',   label: 'Ежедневно',   short: 'Каждый день' },
  { value: '0 9 * * 1',   label: 'Еженедельно', short: 'Каждую неделю' },
  { value: '0 9 1 * *',   label: 'Ежемесячно',  short: 'Каждый месяц' },
  { value: '0 9 1 */3 *', label: 'Ежеквартально', short: 'Раз в квартал' },
  { value: '0 9 1 1 *',   label: 'Ежегодно',    short: 'Раз в год' },
]

function scheduleLabel(schedule: string): string {
  return SCHEDULE_OPTIONS.find((o) => o.value === schedule)?.short ?? schedule
}

function formatAmount(amount: { toString(): string } | number | string, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// ─── Form Dialog ─────────────────────────────────────────────────────────────

interface FormValues {
  name: string
  amount: string
  type: TxType
  accountId: string
  schedule: ScheduleValue
  reminderDays: number
}

interface RecurringFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: { id: string; name: string; amount: { toString(): string } | number | string }
}

function RecurringFormDialog({ open, onOpenChange, initialData }: RecurringFormDialogProps) {
  const utils = trpc.useUtils()
  const isEdit = !!initialData

  const [form, setForm] = useState<FormValues>({
    name:         initialData?.name ?? '',
    amount:       initialData ? String(initialData.amount) : '',
    type:         'EXPENSE',
    accountId:    '',
    schedule:     '0 9 1 * *',
    reminderDays: 3,
  })

  const { data: accounts = [] } = trpc.account.listAll.useQuery()

  const createMutation = trpc.recurring.create.useMutation({
    onSuccess: () => {
      toast.success('Регулярный платёж добавлен')
      utils.recurring.list.invalidate()
      onOpenChange(false)
      setForm({ name: '', amount: '', type: 'EXPENSE', accountId: '', schedule: '0 9 1 * *', reminderDays: 3 })
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = trpc.recurring.update.useMutation({
    onSuccess: () => {
      toast.success('Сохранено')
      utils.recurring.list.invalidate()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.amount) return

    if (isEdit) {
      updateMutation.mutate({
        id:     initialData.id,
        name:   form.name.trim(),
        amount: parseFloat(form.amount),
      })
    } else {
      if (!form.accountId) { toast.error('Выберите счёт'); return }
      createMutation.mutate({
        name:         form.name.trim(),
        amount:       parseFloat(form.amount),
        type:         form.type,
        accountId:    form.accountId,
        schedule:     form.schedule,
        reminderDays: form.reminderDays,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEdit ? 'Редактировать платёж' : 'Новый регулярный платёж'}</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Название */}
          <div className="space-y-1.5">
            <Label>Название *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Например: Netflix"
              maxLength={100}
              required
            />
          </div>

          {/* Сумма */}
          <div className="space-y-1.5">
            <Label>Сумма *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          {/* Тип — только при создании */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.type === 'EXPENSE' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setForm((f) => ({ ...f, type: 'EXPENSE' }))}
                >
                  Расход
                </Button>
                <Button
                  type="button"
                  variant={form.type === 'INCOME' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setForm((f) => ({ ...f, type: 'INCOME' }))}
                >
                  Доход
                </Button>
              </div>
            </div>
          )}

          {/* Счёт — только при создании */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Счёт *</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Расписание — только при создании */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Расписание</Label>
              <Select
                value={form.schedule}
                onValueChange={(v) => setForm((f) => ({ ...f, schedule: v as ScheduleValue }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Напоминание */}
          <div className="space-y-1.5">
            <Label>Напомнить за N дней</Label>
            <Input
              type="number"
              value={form.reminderDays}
              onChange={(e) => setForm((f) => ({ ...f, reminderDays: parseInt(e.target.value) || 0 }))}
              min={0}
              max={30}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
          </Button>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

interface RecurringRule {
  id: string
  name: string
  // Prisma возвращает Decimal, который сериализуется в string или имеет .toString()
  amount: { toString(): string } | number | string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  schedule: string
  nextRunAt: string | Date
  isActive: boolean
  transactions: Array<{
    accountId: string
    account: { name: string; currency: string }
  }>
}

interface RuleCardProps {
  rule: RecurringRule
  onEdit: () => void
}

function RuleCard({ rule, onEdit }: RuleCardProps) {
  const utils = trpc.useUtils()

  const currency = rule.transactions[0]?.account.currency ?? 'RUB'
  const accountName = rule.transactions[0]?.account.name ?? '—'

  const toggleMutation = trpc.recurring.update.useMutation({
    onSuccess: () => utils.recurring.list.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = trpc.recurring.delete.useMutation({
    onSuccess: () => {
      toast.success('Удалено')
      utils.recurring.list.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const isExpense = rule.type === 'EXPENSE'

  return (
    <div className={`glass-card card-interactive rounded-2xl transition-opacity ${!rule.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4 p-4">
        {/* Иконка типа */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isExpense ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'
          }`}
        >
          {isExpense
            ? <ArrowDownRight className="h-5 w-5" />
            : <ArrowUpRight className="h-5 w-5" />
          }
        </div>

        {/* Инфо */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{rule.name}</span>
            {!rule.isActive && (
              <Badge variant="secondary" className="shrink-0 text-xs">Пауза</Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{scheduleLabel(rule.schedule)}</span>
            <span>·</span>
            <span>{accountName}</span>
            <span>·</span>
            <span>след. {formatDate(rule.nextRunAt)}</span>
          </div>
        </div>

        {/* Сумма */}
        <div className={`shrink-0 text-right font-semibold ${isExpense ? 'text-expense' : 'text-income'}`}>
          {isExpense ? '-' : '+'}{formatAmount(rule.amount, currency)}
        </div>

        {/* Действия */}
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={rule.isActive}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ id: rule.id, isActive: checked })
            }
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
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
                <AlertDialogTitle>Удалить регулярный платёж?</AlertDialogTitle>
                <AlertDialogDescription>
                  Прошлые транзакции останутся. Новые создаваться не будут.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate({ id: rule.id })}
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editRule, setEditRule] = useState<RecurringRule | null>(null)

  const { data: rules = [], isLoading } = trpc.recurring.list.useQuery()

  const activeRules = rules.filter((r) => r.isActive)
  const pausedRules = rules.filter((r) => !r.isActive)

  const totalMonthlyExpense = activeRules
    .filter((r) => r.type === 'EXPENSE' && r.schedule === '0 9 1 * *')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Регулярные платежи"
        description="Подписки, кредиты, зарплата и другие повторяющиеся транзакции"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить
          </Button>
        }
      />

      {/* Stat: суммарный ежемесячный расход */}
      {!isLoading && totalMonthlyExpense > 0 && (
        <div className="glass-card card-default rounded-2xl flex items-center gap-3 p-4">
          <Repeat2 className="h-5 w-5 text-expense" />
          <div>
            <p className="text-sm font-medium">Ежемесячных подписок</p>
            <p className="text-xs text-muted-foreground">{activeRules.filter(r => r.type === 'EXPENSE' && r.schedule === '0 9 1 * *').length} платежей</p>
          </div>
          <p className="ml-auto text-lg font-semibold text-expense">
            -{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(totalMonthlyExpense)}
          </p>
        </div>
      )}

      {/* Список */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card card-default rounded-2xl">
              <div className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="mb-3 text-4xl">💳</div>
          <p className="mb-1 font-medium text-foreground">Нет регулярных платежей</p>
          <p className="mb-4 text-sm">Добавьте подписки, кредит или зарплату</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить первый
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRules.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Активные ({activeRules.length})
              </p>
              <StaggerList className="space-y-3">
                {activeRules.map((rule) => (
                  <StaggerItem key={rule.id}>
                    <RuleCard rule={rule} onEdit={() => setEditRule(rule)} />
                  </StaggerItem>
                ))}
              </StaggerList>
            </div>
          )}

          {pausedRules.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                На паузе ({pausedRules.length})
              </p>
              <StaggerList className="space-y-3">
                {pausedRules.map((rule) => (
                  <StaggerItem key={rule.id}>
                    <RuleCard rule={rule} onEdit={() => setEditRule(rule)} />
                  </StaggerItem>
                ))}
              </StaggerList>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <RecurringFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editRule && (
        <RecurringFormDialog
          open={!!editRule}
          onOpenChange={(o) => { if (!o) setEditRule(null) }}
          initialData={{ id: editRule.id, name: editRule.name, amount: editRule.amount }}
        />
      )}
    </div>
  )
}
