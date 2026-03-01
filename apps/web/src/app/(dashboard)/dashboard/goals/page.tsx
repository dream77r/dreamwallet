'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Target, Plus, Pencil, Trash2, TrendingUp, Calendar, CheckCircle2, PiggyBank } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Goal {
  id: string
  name: string
  targetAmount: { toString(): string } | number | string
  currentAmount: { toString(): string } | number | string
  deadline: string | Date | null
  icon: string | null
  color: string | null
  isCompleted: boolean
  createdAt: string | Date
}

const PRESET_COLORS = [
  '#22C55E', '#3B82F6', '#F97316', '#A855F7', '#EC4899',
  '#EAB308', '#EF4444', '#6366F1', '#14B8A6', '#64748B',
]

const PRESET_GOALS = [
  { icon: '✈️', name: 'Отпуск' },
  { icon: '🏠', name: 'На квартиру' },
  { icon: '🚗', name: 'Автомобиль' },
  { icon: '💻', name: 'Гаджет' },
  { icon: '🎓', name: 'Образование' },
  { icon: '💍', name: 'Свадьба' },
  { icon: '🏖️', name: 'Подушка безопасности' },
  { icon: '🎁', name: 'Подарок' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function toNum(v: { toString(): string } | number | string): number {
  return Number(v)
}

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function daysLeft(deadline: string | Date | null): number | null {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function deadlineLabel(deadline: string | Date | null): string | null {
  const days = daysLeft(deadline)
  if (days === null) return null
  if (days < 0) return 'Срок истёк'
  if (days === 0) return 'Сегодня!'
  if (days === 1) return 'Завтра'
  if (days < 7) return `${days} дня`
  if (days < 30) return `${Math.ceil(days / 7)} нед.`
  if (days < 365) return `${Math.ceil(days / 30)} мес.`
  return `${Math.ceil(days / 365)} г.`
}

// ─── Goal Form Dialog ────────────────────────────────────────────────────────

interface GoalFormData {
  name: string
  icon: string
  color: string
  targetAmount: string
  currentAmount: string
  deadline: string
}

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Goal
}

function GoalFormDialog({ open, onOpenChange, initialData }: GoalFormDialogProps) {
  const utils = trpc.useUtils()
  const isEdit = !!initialData

  const [form, setForm] = useState<GoalFormData>({
    name:          initialData?.name ?? '',
    icon:          initialData?.icon ?? '🎯',
    color:         initialData?.color ?? '#3B82F6',
    targetAmount:  initialData ? String(toNum(initialData.targetAmount)) : '',
    currentAmount: initialData ? String(toNum(initialData.currentAmount)) : '0',
    deadline:      initialData?.deadline
      ? new Date(initialData.deadline).toISOString().split('T')[0]
      : '',
  })

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast.success('Цель создана! 🎯')
      utils.goals.list.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = trpc.goals.update.useMutation({
    onSuccess: () => {
      toast.success('Цель обновлена')
      utils.goals.list.invalidate()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })

  function resetForm() {
    setForm({ name: '', icon: '🎯', color: '#3B82F6', targetAmount: '', currentAmount: '0', deadline: '' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.targetAmount) return

    const data = {
      name:          form.name.trim(),
      icon:          form.icon || undefined,
      color:         form.color || undefined,
      targetAmount:  parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount || '0'),
      deadline:      form.deadline ? new Date(form.deadline) : undefined,
    }

    if (isEdit) {
      updateMutation.mutate({ id: initialData.id, ...data, deadline: data.deadline ?? null })
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && !isEdit) resetForm() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать цель' : 'Новая цель'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Пресеты (только при создании) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Быстрый выбор</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GOALS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
                    onClick={() => setForm((f) => ({ ...f, icon: p.icon, name: f.name || p.name }))}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Название + иконка */}
          <div className="flex gap-2">
            <div className="space-y-1.5 w-16">
              <Label>Иконка</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className="text-center text-lg"
                maxLength={4}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Название *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Отпуск в Европе"
                maxLength={100}
                required
              />
            </div>
          </div>

          {/* Целевая сумма */}
          <div className="space-y-1.5">
            <Label>Целевая сумма ₽ *</Label>
            <Input
              type="number"
              value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              placeholder="150 000"
              min="1"
              required
            />
          </div>

          {/* Уже накоплено */}
          <div className="space-y-1.5">
            <Label>Уже накоплено ₽</Label>
            <Input
              type="number"
              value={form.currentAmount}
              onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Дедлайн */}
          <div className="space-y-1.5">
            <Label>Дедлайн (необязательно)</Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Цвет */}
          <div className="space-y-1.5">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? '#000' : 'transparent',
                    outline: form.color === c ? '2px solid white' : 'none',
                    outlineOffset: '1px',
                  }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать цель'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Progress Dialog ──────────────────────────────────────────────────────

interface AddProgressDialogProps {
  goal: Goal
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AddProgressDialog({ goal, open, onOpenChange }: AddProgressDialogProps) {
  const utils = trpc.useUtils()
  const [amount, setAmount] = useState('')

  const addMutation = trpc.goals.addProgress.useMutation({
    onSuccess: (result) => {
      const newCurrent = toNum(result.currentAmount)
      const target = toNum(result.targetAmount)
      if (result.isCompleted) {
        toast.success('🎉 Цель достигнута! Поздравляем!')
      } else {
        toast.success(`Добавлено! Осталось ${formatAmount(target - newCurrent)}`)
      }
      utils.goals.list.invalidate()
      onOpenChange(false)
      setAmount('')
    },
    onError: (e) => toast.error(e.message),
  })

  const remaining = toNum(goal.targetAmount) - toNum(goal.currentAmount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Пополнить копилку</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            {goal.icon} {goal.name} — осталось накопить{' '}
            <strong>{formatAmount(remaining)}</strong>
          </p>
          <div className="space-y-1.5">
            <Label>Сумма пополнения ₽</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5 000"
              min="1"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            {[1000, 5000, 10000].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAmount(String(v))}
              >
                {(v / 1000).toFixed(0)}к
              </Button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!amount || addMutation.isPending}
            onClick={() => addMutation.mutate({ id: goal.id, amount: parseFloat(amount) })}
          >
            {addMutation.isPending ? 'Сохранение...' : 'Пополнить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal
}

function GoalCard({ goal }: GoalCardProps) {
  const utils = trpc.useUtils()
  const [editOpen, setEditOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)

  const current = toNum(goal.currentAmount)
  const target  = toNum(goal.targetAmount)
  const pct     = Math.min(100, Math.round((current / target) * 100))
  const color   = goal.color ?? '#3B82F6'
  const dl      = deadlineLabel(goal.deadline)

  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => {
      toast.success('Цель удалена')
      utils.goals.list.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <Card className={`relative overflow-hidden transition-shadow hover:shadow-md ${goal.isCompleted ? 'opacity-80' : ''}`}>
        {/* Цветная полоска сверху */}
        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />

        <CardHeader className="pt-5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Круглая иконка */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `${color}20` }}
              >
                {goal.icon ?? '🎯'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold leading-tight">{goal.name}</h3>
                  {goal.isCompleted && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                {dl && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{dl}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
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
                    <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Цель «{goal.name}» будет удалена безвозвратно.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => deleteMutation.mutate({ id: goal.id })}
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-4">
          {/* Суммы */}
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold" style={{ color }}>
              {formatAmount(current)}
            </span>
            <span className="text-sm text-muted-foreground">
              из {formatAmount(target)}
            </span>
          </div>

          {/* Прогресс-бар */}
          <div className="space-y-1">
            <Progress
              value={pct}
              className="h-2.5 [&>div]:transition-all"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pct}% накоплено</span>
              <span>осталось {formatAmount(Math.max(0, target - current))}</span>
            </div>
          </div>

          {/* Кнопка пополнить */}
          {!goal.isCompleted && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setProgressOpen(true)}
              style={{ borderColor: `${color}40`, color }}
            >
              <PiggyBank className="mr-1.5 h-3.5 w-3.5" />
              Пополнить копилку
            </Button>
          )}

          {goal.isCompleted && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 py-2 text-sm font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Цель достигнута! 🎉
            </div>
          )}
        </CardContent>
      </Card>

      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} initialData={goal} />
      <AddProgressDialog goal={goal} open={progressOpen} onOpenChange={setProgressOpen} />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: goals = [], isLoading } = trpc.goals.list.useQuery()

  const active    = goals.filter((g) => !g.isCompleted)
  const completed = goals.filter((g) => g.isCompleted)

  const totalTarget  = active.reduce((s, g) => s + toNum(g.targetAmount), 0)
  const totalCurrent = active.reduce((s, g) => s + toNum(g.currentAmount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Финансовые цели</h1>
          <p className="text-sm text-muted-foreground">Откладывай на мечты и отслеживай прогресс</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Новая цель
        </Button>
      </div>

      {/* Общий прогресс */}
      {!isLoading && active.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Всего по {active.length} целям</p>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="font-semibold">{formatAmount(totalCurrent)}</span>
                <span className="text-muted-foreground">из {formatAmount(totalTarget)}</span>
                <Badge variant="secondary" className="ml-auto">
                  {Math.round((totalCurrent / totalTarget) * 100)}%
                </Badge>
              </div>
              <Progress
                value={Math.min(100, (totalCurrent / totalTarget) * 100)}
                className="mt-2 h-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-5 flex-1" />
                </div>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-20 text-muted-foreground">
          <div className="mb-4 text-5xl">🎯</div>
          <p className="mb-1 text-lg font-medium text-foreground">Пока нет целей</p>
          <p className="mb-6 text-sm">Поставь финансовую цель и начни двигаться к ней</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Создать первую цель
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Активные */}
          {active.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                В процессе ({active.length})
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((g) => <GoalCard key={g.id} goal={g} />)}
              </div>
            </div>
          )}

          {/* Завершённые */}
          {completed.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Достигнуто 🎉 ({completed.length})
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((g) => <GoalCard key={g.id} goal={g} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <GoalFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
