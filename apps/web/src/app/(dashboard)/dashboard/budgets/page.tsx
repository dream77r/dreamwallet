'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Gamepad2,
  Shirt,
  Zap,
  Heart,
  Dumbbell,
  BookOpen,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type BudgetPeriod = 'month' | 'week' | 'year'
type BudgetStatus = 'ok' | 'warning' | 'over'

interface Budget {
  id: number
  category: string
  spent: number
  total: number
  period: BudgetPeriod
  icon: React.ReactNode
  color: string
}

const mockBudgets: Budget[] = [
  {
    id: 1,
    category: 'Продукты',
    spent: 18500,
    total: 22000,
    period: 'month',
    icon: <ShoppingCart className="h-4 w-4" />,
    color: 'bg-green-500',
  },
  {
    id: 2,
    category: 'Транспорт',
    spent: 8200,
    total: 10000,
    period: 'month',
    icon: <Car className="h-4 w-4" />,
    color: 'bg-blue-500',
  },
  {
    id: 3,
    category: 'Кафе и рестораны',
    spent: 12300,
    total: 12000,
    period: 'month',
    icon: <UtensilsCrossed className="h-4 w-4" />,
    color: 'bg-orange-500',
  },
  {
    id: 4,
    category: 'Развлечения',
    spent: 6800,
    total: 8000,
    period: 'month',
    icon: <Gamepad2 className="h-4 w-4" />,
    color: 'bg-purple-500',
  },
  {
    id: 5,
    category: 'Одежда',
    spent: 4290,
    total: 10000,
    period: 'month',
    icon: <Shirt className="h-4 w-4" />,
    color: 'bg-pink-500',
  },
  {
    id: 6,
    category: 'Коммунальные',
    spent: 7600,
    total: 8000,
    period: 'month',
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-yellow-500',
  },
  {
    id: 7,
    category: 'Здоровье',
    spent: 1230,
    total: 5000,
    period: 'month',
    icon: <Heart className="h-4 w-4" />,
    color: 'bg-red-500',
  },
  {
    id: 8,
    category: 'Спорт',
    spent: 3500,
    total: 4000,
    period: 'month',
    icon: <Dumbbell className="h-4 w-4" />,
    color: 'bg-indigo-500',
  },
  {
    id: 9,
    category: 'Образование',
    spent: 0,
    total: 5000,
    period: 'month',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'bg-teal-500',
  },
]

const periodLabels: Record<BudgetPeriod, string> = {
  month: 'в месяц',
  week: 'в неделю',
  year: 'в год',
}

function getStatus(spent: number, total: number): BudgetStatus {
  const pct = spent / total
  if (pct > 1) return 'over'
  if (pct >= 0.85) return 'warning'
  return 'ok'
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusConfig = {
  ok: { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, progressClass: '' },
  warning: { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, progressClass: '[&>div]:bg-yellow-500' },
  over: { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, progressClass: '[&>div]:bg-red-500' },
}

export default function BudgetsPage() {
  const totalBudget = mockBudgets.reduce((s, b) => s + b.total, 0)
  const totalSpent = mockBudgets.reduce((s, b) => s + b.spent, 0)
  const totalRemaining = totalBudget - totalSpent
  const overBudgets = mockBudgets.filter(b => b.spent > b.total)
  const warningBudgets = mockBudgets.filter(b => {
    const pct = b.spent / b.total
    return pct >= 0.85 && pct <= 1
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Бюджеты</h1>
          <p className="text-muted-foreground text-sm">Февраль 2026 · {mockBudgets.length} бюджетов</p>
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
            <p className="text-xl font-semibold">{formatAmount(totalBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">на месяц</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Потрачено</p>
            <p className="text-xl font-semibold">{formatAmount(totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((totalSpent / totalBudget) * 100)}% от бюджета
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Остаток</p>
            <p className={`text-xl font-semibold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(Math.abs(totalRemaining))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {overBudgets.length > 0 && (
                <span className="text-red-600">{overBudgets.length} превышен{overBudgets.length > 1 ? 'о' : ''}</span>
              )}
              {overBudgets.length === 0 && warningBudgets.length > 0 && (
                <span className="text-yellow-600">{warningBudgets.length} близко к лимиту</span>
              )}
              {overBudgets.length === 0 && warningBudgets.length === 0 && (
                <span className="text-green-600">Всё в норме</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Общий прогресс</p>
            <p className="text-sm text-muted-foreground">
              {formatAmount(totalSpent)} / {formatAmount(totalBudget)}
            </p>
          </div>
          <Progress
            value={Math.min(Math.round((totalSpent / totalBudget) * 100), 100)}
            className="h-3"
          />
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
            <span>{Math.round((totalSpent / totalBudget) * 100)}% использовано</span>
            <span>Осталось {formatAmount(Math.abs(totalRemaining))}</span>
          </div>
        </CardContent>
      </Card>

      {/* Budget list */}
      <div className="space-y-3">
        {mockBudgets.map((budget) => {
          const pct = Math.min(Math.round((budget.spent / budget.total) * 100), 100)
          const status = getStatus(budget.spent, budget.total)
          const remaining = budget.total - budget.spent

          return (
            <Card key={budget.id}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${budget.color} text-white`}>
                    {budget.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{budget.category}</span>
                        {statusConfig[status].icon}
                        <span className="text-xs text-muted-foreground">{periodLabels[budget.period]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {formatAmount(budget.spent)}
                          <span className="text-muted-foreground font-normal"> / {formatAmount(budget.total)}</span>
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Редактировать</DropdownMenuItem>
                            <DropdownMenuItem>Транзакции</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Удалить</DropdownMenuItem>
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
    </div>
  )
}
