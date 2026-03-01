'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Zap, Pencil, Trash2, Plus, ArrowRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

type RuleField = 'description' | 'counterparty'

interface AutoRule {
  id: string
  field: string
  pattern: string
  isRegex: boolean
  isActive: boolean
  priority: number
  category: {
    id: string
    name: string
    icon: string | null
    color: string | null
    type: string
  }
}

const FIELD_LABELS: Record<RuleField, string> = {
  description:  'Описание',
  counterparty: 'Контрагент',
}

// ─── Form Dialog ─────────────────────────────────────────────────────────────

interface FormData {
  pattern:    string
  categoryId: string
  field:      RuleField
  isRegex:    boolean
}

interface RuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: AutoRule
}

function RuleFormDialog({ open, onOpenChange, initialData }: RuleFormDialogProps) {
  const utils = trpc.useUtils()
  const isEdit = !!initialData

  const [form, setForm] = useState<FormData>({
    pattern:    initialData?.pattern ?? '',
    categoryId: initialData?.category.id ?? '',
    field:      (initialData?.field as RuleField) ?? 'description',
    isRegex:    initialData?.isRegex ?? false,
  })

  const { data: categories = [] } = trpc.category.list.useQuery()

  const createMutation = trpc.autoRules.create.useMutation({
    onSuccess: () => {
      toast.success('Правило создано')
      utils.autoRules.list.invalidate()
      onOpenChange(false)
      setForm({ pattern: '', categoryId: '', field: 'description', isRegex: false })
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = trpc.autoRules.update.useMutation({
    onSuccess: () => {
      toast.success('Сохранено')
      utils.autoRules.list.invalidate()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.pattern.trim()) return

    if (isEdit) {
      updateMutation.mutate({
        id:         initialData.id,
        pattern:    form.pattern.trim(),
        categoryId: form.categoryId || undefined,
        field:      form.field,
        isRegex:    form.isRegex,
      })
    } else {
      if (!form.categoryId) { toast.error('Выберите категорию'); return }
      createMutation.mutate({
        pattern:    form.pattern.trim(),
        categoryId: form.categoryId,
        field:      form.field,
        isRegex:    form.isRegex,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать правило' : 'Новое правило'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Ключевое слово */}
          <div className="space-y-1.5">
            <Label>Ключевое слово / шаблон *</Label>
            <Input
              value={form.pattern}
              onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
              placeholder={form.isRegex ? 'netflix|spotify|яндекс' : 'Netflix'}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {form.isRegex
                ? 'Регулярное выражение, без учёта регистра'
                : 'Если это слово есть в тексте — правило сработает'}
            </p>
          </div>

          {/* Поле поиска */}
          <div className="space-y-1.5">
            <Label>Искать в</Label>
            <Select
              value={form.field}
              onValueChange={(v) => setForm((f) => ({ ...f, field: v as RuleField }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Описание транзакции</SelectItem>
                <SelectItem value="counterparty">Контрагент</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Категория */}
          <div className="space-y-1.5">
            <Label>Присвоить категорию *</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {['EXPENSE', 'INCOME'].map((type) => {
                  const filtered = categories.filter((c) => c.type === type)
                  if (!filtered.length) return null
                  return (
                    <div key={type}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {type === 'EXPENSE' ? 'Расходы' : 'Доходы'}
                      </div>
                      {filtered.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}
                        </SelectItem>
                      ))}
                    </div>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Regex переключатель */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Регулярное выражение</p>
              <p className="text-xs text-muted-foreground">Для продвинутых шаблонов</p>
            </div>
            <Switch
              checked={form.isRegex}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isRegex: v }))}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: AutoRule
  onEdit: () => void
}

function RuleCard({ rule, onEdit }: RuleCardProps) {
  const utils = trpc.useUtils()

  const toggleMutation = trpc.autoRules.update.useMutation({
    onSuccess: () => utils.autoRules.list.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = trpc.autoRules.delete.useMutation({
    onSuccess: () => {
      toast.success('Удалено')
      utils.autoRules.list.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Card className={`transition-opacity ${!rule.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="flex items-center gap-4 p-4">
        {/* Визуальная схема правила */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="text-xs text-muted-foreground shrink-0">
              {FIELD_LABELS[rule.field as RuleField]}:
            </span>
            <code className="truncate font-mono font-medium">{rule.pattern}</code>
            {rule.isRegex && (
              <Badge variant="outline" className="shrink-0 text-[10px]">regex</Badge>
            )}
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

          <div className="flex shrink-0 items-center gap-1.5">
            {rule.category.icon && (
              <span className="text-base leading-none">{rule.category.icon}</span>
            )}
            {rule.category.color && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: rule.category.color }}
              />
            )}
            <span className="text-sm font-medium">{rule.category.name}</span>
          </div>
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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить правило?</AlertDialogTitle>
                <AlertDialogDescription>
                  Существующие транзакции не изменятся. Новые перестанут автоматически получать эту категорию.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteMutation.mutate({ id: rule.id })}
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutoRulesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editRule, setEditRule] = useState<AutoRule | null>(null)

  const { data: rules = [], isLoading } = trpc.autoRules.list.useQuery()

  const activeCount  = rules.filter((r) => r.isActive).length
  const inactiveRules = rules.filter((r) => !r.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Авто-категоризация</h1>
          <p className="text-sm text-muted-foreground">
            Правила автоматически назначают категории новым транзакциям
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить правило
        </Button>
      </div>

      {/* Подсказка как это работает */}
      {rules.length === 0 && !isLoading && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20">
          <CardContent className="flex gap-3 p-4">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Как это работает?</p>
              <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                Создайте правило — например, ключевое слово <strong>Netflix</strong> → категория <strong>Подписки</strong>.
                При импорте или добавлении транзакции система автоматически проставит категорию.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Активных правил */}
      {!isLoading && rules.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Активных правил: <strong>{activeCount}</strong> из {rules.length}
        </p>
      )}

      {/* Список */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16 text-muted-foreground">
          <div className="mb-3 text-4xl">⚡</div>
          <p className="mb-1 font-medium text-foreground">Нет правил</p>
          <p className="mb-4 text-sm">Добавьте первое правило авто-категоризации</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Создать правило
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Активные */}
          <div className="space-y-3">
            {rules.filter((r) => r.isActive).map((rule) => (
              <RuleCard key={rule.id} rule={rule} onEdit={() => setEditRule(rule)} />
            ))}
          </div>

          {/* Отключённые */}
          {inactiveRules.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Отключённые ({inactiveRules.length})
              </p>
              {inactiveRules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} onEdit={() => setEditRule(rule)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <RuleFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editRule && (
        <RuleFormDialog
          open={!!editRule}
          onOpenChange={(o) => { if (!o) setEditRule(null) }}
          initialData={editRule}
        />
      )}
    </div>
  )
}
