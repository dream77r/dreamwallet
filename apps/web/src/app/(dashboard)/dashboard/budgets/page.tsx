'use client'

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  PiggyBank,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { BudgetForm } from '@/components/budgets/budget-form'
import { PageHeader } from '@/components/ui/page-header'
import { StatCarousel, StatCard } from '@/components/ui/stat-carousel'
import { GradientHero } from '@/components/ui/gradient-hero'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'

type BudgetPeriod = 'MONTHLY' | 'WEEKLY' | 'YEARLY'
type BudgetStatus = 'ok' | 'warning' | 'over'

const periodLabels: Record<BudgetPeriod, string> = {
  MONTHLY: 'в месяц',
  WEEKLY: 'в неделю',
  YEARLY: 'в год',
}

function getStatus(pct: number): BudgetStatus {
  if (pct > 100) return 'over'
  if (pct >= 85) return 'warning'
  return 'ok'
}

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusConfig = {
  ok: { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, progressClass: '' },
  warning: { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, progressClass: '[&>div]:bg-yellow-500' },
  over: { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, progressClass: '[&>div]:bg-red-500' },
}

const CATEGORY_COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-purple-500',
  'bg-pink-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
]

export default function BudgetsPage() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const utils = trpc.useUtils()

  // Get wallet first to retrieve walletId
  const { data: wallet } = trpc.wallet.get.useQuery()
  const walletId = wallet?.id

  const { data: budgets, isLoading } = trpc.budget.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  const deleteMutation = trpc.budget.delete.useMutation({
    onSuccess: () => {
      toast.success('Бюджет удалён')
      void utils.budget.list.invalidate()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  const totalBudget = budgets?.reduce((s, b) => s + b.amount, 0) ?? 0
  const totalSpent = budgets?.reduce((s, b) => s + b.spentAmount, 0) ?? 0
  const totalRemaining = totalBudget - totalSpent
  const overBudgets = budgets?.filter(b => b.spentAmount > b.amount) ?? []
  const warningBudgets = budgets?.filter(b => {
    const pct = b.percentage
    return pct >= 85 && pct <= 100
  }) ?? []
  const overallPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0

  const now = new Date()
  const monthLabel = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const remainingStatusNode = overBudgets.length > 0 ? (
    <span className="text-expense">{overBudgets.length} превышен{overBudgets.length > 1 ? 'о' : ''}</span>
  ) : warningBudgets.length > 0 ? (
    <span className="text-yellow-600">{warningBudgets.length} близко к лимиту</span>
  ) : (
    <span className="text-income">Всё в норме</span>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Бюджеты"
        description={`${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} · ${isLoading ? '...' : `${budgets?.length ?? 0} бюджетов`}`}
        actions={walletId ? <BudgetForm walletId={walletId} /> : undefined}
      />

      {/* Summary stat cards */}
      <StatCarousel columns={3}>
        <StatCard
          label="ОБЩИЙ БЮДЖЕТ"
          value={isLoading ? '—' : formatAmount(totalBudget)}
        />
        <StatCard
          label="ПОТРАЧЕНО"
          value={isLoading ? '—' : formatAmount(totalSpent)}
        />
        <StatCard
          label="ОСТАТОК"
          value={isLoading ? '—' : formatAmount(Math.abs(totalRemaining))}
          className={!isLoading ? (totalRemaining >= 0 ? 'text-income' : 'text-expense') : undefined}
        />
      </StatCarousel>

      {/* Overall progress */}
      {!isLoading && totalBudget > 0 && (
        <GradientHero variant="default" compact>
          {/* Mobile (inside gradient): white text labels */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold opacity-90">Общий прогресс</p>
              <p className="text-sm opacity-80">
                {formatAmount(totalSpent)} / {formatAmount(totalBudget)}
              </p>
            </div>
            <Progress value={overallPct} className="h-3 bg-white/30 [&>div]:bg-white" />
            <div className="flex justify-between mt-2 text-xs opacity-75">
              <span>{overallPct}% использовано</span>
              <span>Осталось {formatAmount(Math.abs(totalRemaining))}</span>
            </div>
          </div>

          {/* Desktop (clean, no gradient): muted text labels */}
          <div className="hidden md:block glass-card card-default rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Общий прогресс</p>
              <p className="text-sm text-muted-foreground">
                {formatAmount(totalSpent)} / {formatAmount(totalBudget)}
              </p>
            </div>
            <Progress value={overallPct} className="h-3" />
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>{overallPct}% использовано</span>
              <span>Осталось {formatAmount(Math.abs(totalRemaining))}</span>
            </div>
          </div>
        </GradientHero>
      )}

      {/* Edit form (controlled) */}
      {editingId && walletId && budgets && (() => {
        const b = budgets.find(x => x.id === editingId)
        if (!b) return null
        return (
          <BudgetForm
            walletId={walletId}
            initialData={{ id: b.id, categoryId: b.categoryId, amount: b.amount, period: b.period as 'WEEKLY' | 'MONTHLY' | 'YEARLY', alertThreshold: (b as { alertThreshold?: number | null }).alertThreshold ?? 80 }}
            open={!!editingId}
            onOpenChange={(o) => { if (!o) setEditingId(null) }}
          />
        )
      })()}

      {/* Budget list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card card-default rounded-2xl p-5">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : !budgets || budgets.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PiggyBank className="h-10 w-10 mb-3" />
          <p className="font-medium mb-1">Нет бюджетов</p>
          <p className="text-sm">Создайте первый бюджет для контроля расходов</p>
          <div className="mt-4">
            {walletId && <BudgetForm walletId={walletId} />}
          </div>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {budgets.map((budget, index) => {
            const pct = Math.min(budget.percentage, 100)
            const status = getStatus(budget.percentage)
            const remaining = budget.amount - budget.spentAmount

            return (
              <StaggerItem key={budget.id}>
                <div className="glass-card card-interactive rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} text-white text-base`}>
                      {budget.category.icon ?? '📦'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{budget.category.name}</span>
                          {statusConfig[status].icon}
                          <span className="text-xs text-muted-foreground">
                            {periodLabels[budget.period as BudgetPeriod] ?? 'в месяц'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            {formatAmount(budget.spentAmount)}
                            <span className="text-muted-foreground font-normal"> / {formatAmount(budget.amount)}</span>
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingId(budget.id)}>Редактировать</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-expense"
                                onClick={() => deleteMutation.mutate({ id: budget.id })}
                              >
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <Progress
                        value={pct}
                        className={`h-2.5 ${statusConfig[status].progressClass}`}
                      />

                      <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                        <span>{pct}% использовано</span>
                        {status === 'over' ? (
                          <span className="text-expense font-medium flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Превышен на {formatAmount(Math.abs(remaining))}
                          </span>
                        ) : (
                          <span>Остаток {formatAmount(remaining)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerList>
      )}
    </div>
  )
}
