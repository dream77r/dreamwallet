'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Бюджеты</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {monthLabel} · {isLoading ? '...' : `${budgets?.length ?? 0} бюджетов`}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Создать бюджет
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Общий бюджет</p>
            {isLoading ? <Skeleton className="h-6 w-28" /> : (
              <>
                <p className="text-xl font-semibold">{formatAmount(totalBudget)}</p>
                <p className="text-xs text-muted-foreground mt-1">на месяц</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Потрачено</p>
            {isLoading ? <Skeleton className="h-6 w-28" /> : (
              <>
                <p className="text-xl font-semibold">{formatAmount(totalSpent)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% от бюджета` : '—'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Остаток</p>
            {isLoading ? <Skeleton className="h-6 w-28" /> : (
              <>
                <p className={`text-xl font-semibold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(Math.abs(totalRemaining))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overBudgets.length > 0 ? (
                    <span className="text-red-600">{overBudgets.length} превышен{overBudgets.length > 1 ? 'о' : ''}</span>
                  ) : warningBudgets.length > 0 ? (
                    <span className="text-yellow-600">{warningBudgets.length} близко к лимиту</span>
                  ) : (
                    <span className="text-green-600">Всё в норме</span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overall progress */}
      {!isLoading && totalBudget > 0 && (
        <Card>
          <CardContent className="pt-5 pb-5">
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
          </CardContent>
        </Card>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !budgets || budgets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 border-dashed text-muted-foreground">
          <PiggyBank className="h-10 w-10 mb-3" />
          <p className="font-medium mb-1">Нет бюджетов</p>
          <p className="text-sm">Создайте первый бюджет для контроля расходов</p>
          <Button className="mt-4">
            <Plus className="h-4 w-4" />
            Создать бюджет
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget, index) => {
            const pct = Math.min(budget.percentage, 100)
            const status = getStatus(budget.percentage)
            const remaining = budget.amount - budget.spentAmount
            const color = budget.category.color ? `bg-[${budget.category.color}]` : CATEGORY_COLORS[index % CATEGORY_COLORS.length]

            return (
              <Card key={budget.id}>
                <CardContent className="pt-5 pb-4">
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
                              <DropdownMenuItem>Редактировать</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
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
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Превышен на {formatAmount(Math.abs(remaining))}
                          </span>
                        ) : (
                          <span>Остаток {formatAmount(remaining)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
