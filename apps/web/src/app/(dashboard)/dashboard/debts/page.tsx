'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Plus, HandCoins } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

function formatAmount(amount: number | string | { toString(): string }, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Активен', variant: 'default' },
  PARTIALLY_REPAID: { label: 'Частично', variant: 'secondary' },
  REPAID: { label: 'Погашен', variant: 'outline' },
  CANCELLED: { label: 'Отменён', variant: 'destructive' },
}

export default function DebtsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [repayDebtId, setRepayDebtId] = useState<string | null>(null)
  const [repayAmount, setRepayAmount] = useState('')
  const [tab, setTab] = useState<'LENT' | 'BORROWED'>('LENT')

  const utils = trpc.useUtils()
  const { data: debts = [], isLoading } = trpc.debts.list.useQuery()

  const deleteMutation = trpc.debts.delete.useMutation({
    onSuccess: () => { toast.success('Долг удалён'); utils.debts.list.invalidate() },
    onError: (e) => toast.error(e.message),
  })

  const repayMutation = trpc.debts.repay.useMutation({
    onSuccess: () => {
      toast.success('Погашение записано')
      utils.debts.list.invalidate()
      setRepayDebtId(null)
      setRepayAmount('')
    },
    onError: (e) => toast.error(e.message),
  })

  const lent = debts.filter(d => d.type === 'LENT')
  const borrowed = debts.filter(d => d.type === 'BORROWED')

  const totalLent = lent.reduce((s, d) => s + Number(d.amount) - Number(d.paidAmount), 0)
  const totalBorrowed = borrowed.reduce((s, d) => s + Number(d.amount) - Number(d.paidAmount), 0)

  const activeList = tab === 'LENT' ? lent : borrowed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Долги и займы</h1>
          <p className="text-sm text-muted-foreground">Учёт кто кому и сколько должен</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Мне должны</p>
            <p className="text-xl font-semibold text-green-600">{formatAmount(totalLent)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Я должен</p>
            <p className="text-xl font-semibold text-red-600">{formatAmount(totalBorrowed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'LENT' | 'BORROWED')}>
        <TabsList>
          <TabsTrigger value="LENT">Мне должны ({lent.length})</TabsTrigger>
          <TabsTrigger value="BORROWED">Я должен ({borrowed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Загрузка...</CardContent></Card>
          ) : activeList.length === 0 ? (
            <Card className="flex flex-col items-center justify-center border-dashed py-16 text-muted-foreground">
              <HandCoins className="mb-3 h-10 w-10" />
              <p className="mb-1 font-medium text-foreground">
                {tab === 'LENT' ? 'Никто вам не должен' : 'Вы никому не должны'}
              </p>
              <p className="mb-4 text-sm">Добавьте запись о долге или займе</p>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Добавить
              </Button>
            </Card>
          ) : (
            activeList.map((debt) => {
              const total = Number(debt.amount)
              const paid = Number(debt.paidAmount)
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0
              const statusInfo = STATUS_LABELS[debt.status] ?? STATUS_LABELS.ACTIVE

              return (
                <Card key={debt.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{debt.counterparty}</span>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        {debt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{debt.description}</p>
                        )}
                        {debt.dueDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">Срок: {formatDate(debt.dueDate)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-semibold">{formatAmount(total, debt.currency)}</p>
                        {paid > 0 && <p className="text-xs text-muted-foreground">Погашено: {formatAmount(paid, debt.currency)}</p>}
                      </div>
                    </div>

                    <Progress value={pct} className="h-2" />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{pct}% погашено</span>
                      <div className="flex gap-2">
                        {debt.status !== 'REPAID' && (
                          <Button variant="outline" size="sm" onClick={() => setRepayDebtId(debt.id)}>
                            Погасить
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => deleteMutation.mutate({ id: debt.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateDebtDialog open={createOpen} onOpenChange={setCreateOpen} defaultType={tab} />

      {/* Repay Dialog */}
      <Dialog open={!!repayDebtId} onOpenChange={(o) => { if (!o) { setRepayDebtId(null); setRepayAmount('') } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Погашение долга</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!repayDebtId || !repayAmount) return
              repayMutation.mutate({ id: repayDebtId, amount: parseFloat(repayAmount) })
            }}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label>Сумма погашения</Label>
              <Input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={repayMutation.isPending}>
              {repayMutation.isPending ? 'Сохранение...' : 'Погасить'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateDebtDialog({ open, onOpenChange, defaultType }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  defaultType: 'LENT' | 'BORROWED'
}) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    type: defaultType as 'LENT' | 'BORROWED',
    counterparty: '',
    amount: '',
    description: '',
    dueDate: '',
  })

  const createMutation = trpc.debts.create.useMutation({
    onSuccess: () => {
      toast.success('Долг добавлен')
      utils.debts.list.invalidate()
      onOpenChange(false)
      setForm({ type: defaultType, counterparty: '', amount: '', description: '', dueDate: '' })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый долг</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.counterparty.trim() || !form.amount) return
            createMutation.mutate({
              type: form.type,
              counterparty: form.counterparty.trim(),
              amount: parseFloat(form.amount),
              description: form.description || undefined,
              dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
            })
          }}
          className="space-y-4 pt-1"
        >
          <div className="space-y-1.5">
            <Label>Тип</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.type === 'LENT' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setForm(f => ({ ...f, type: 'LENT' }))}
              >
                Мне должны
              </Button>
              <Button
                type="button"
                variant={form.type === 'BORROWED' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setForm(f => ({ ...f, type: 'BORROWED' }))}
              >
                Я должен
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Кому / от кого *</Label>
            <Input
              value={form.counterparty}
              onChange={(e) => setForm(f => ({ ...f, counterparty: e.target.value }))}
              placeholder="Имя или название"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Сумма *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Описание</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="За что"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Срок возврата</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Сохранение...' : 'Добавить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
