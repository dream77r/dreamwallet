'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { Users, ArrowLeftRight, CreditCard, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Панель управления</h1>
          <p className="text-sm text-muted-foreground">Статистика платформы</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const planCounts = Object.fromEntries(
    stats.subscriptionsByPlan.map((s) => [s.plan, s.count])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Панель управления</h1>
        <p className="text-sm text-muted-foreground">Статистика платформы</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Пользователи</CardDescription>
            <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>Зарегистрировано</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Транзакции</CardDescription>
            <CardTitle className="text-2xl">{stats.totalTransactions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Всего операций</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Счета</CardDescription>
            <CardTitle className="text-2xl">{stats.totalAccounts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Активных счетов</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Подписки</CardDescription>
            <CardTitle className="text-2xl">
              {(planCounts.PRO ?? 0) + (planCounts.BUSINESS ?? 0)} платных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>FREE: {planCounts.FREE ?? 0}, PRO: {planCounts.PRO ?? 0}, BIZ: {planCounts.BUSINESS ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние регистрации</CardTitle>
          <CardDescription>5 новых пользователей</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline">{formatDate(user.createdAt)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
