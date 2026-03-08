'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarClock, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

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

function getSubscriptionEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('netflix')) return '🎬'
  if (n.includes('spotify') || n.includes('music') || n.includes('яндекс.музыка')) return '🎵'
  if (n.includes('gym') || n.includes('фитнес') || n.includes('спорт')) return '💪'
  if (n.includes('internet') || n.includes('интернет')) return '🌐'
  if (n.includes('phone') || n.includes('телефон') || n.includes('мтс') || n.includes('билайн') || n.includes('мегафон')) return '📱'
  return '💳'
}

function daysUntil(date: string | Date): number {
  const now = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export default function SubscriptionsTrackerPage() {
  const { data: rules = [], isLoading } = trpc.recurring.list.useQuery()

  const subscriptions = rules.filter(r => r.type === 'EXPENSE' && r.isActive)

  const totalMonthly = subscriptions
    .filter(r => r.schedule === '0 9 1 * *')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Подписки</h1>
          <p className="text-sm text-muted-foreground">Трекер активных подписок и регулярных списаний</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recurring">
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить подписку
          </Link>
        </Button>
      </div>

      {/* Subscription cards */}
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
      ) : subscriptions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16 text-muted-foreground">
          <CalendarClock className="mb-3 h-10 w-10" />
          <p className="mb-1 font-medium text-foreground">Нет активных подписок</p>
          <p className="mb-4 text-sm">Добавьте регулярный расход, и он появится здесь</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/recurring">
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const days = daysUntil(sub.nextRunAt)
            const isUrgent = days >= 0 && days < 3
            const currency = sub.transactions[0]?.account.currency ?? 'RUB'

            return (
              <Card key={sub.id} className={isUrgent ? 'border-red-200 dark:border-red-900/50' : ''}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                    {getSubscriptionEmoji(sub.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block">{sub.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>Следующее списание: {formatDate(sub.nextRunAt)}</span>
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Total monthly */}
      {!isLoading && totalMonthly > 0 && (
        <Card className="border-muted">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-muted-foreground">Итого в месяц</span>
            <span className="text-lg font-semibold">
              {formatAmount(totalMonthly)}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
