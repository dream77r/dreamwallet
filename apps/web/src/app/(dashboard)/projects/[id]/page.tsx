'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  Users,
  UserPlus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const { data: project, isLoading } = trpc.project.get.useQuery({ id })
  const { data: dashboard } = trpc.project.getDashboard.useQuery({ id })

  const walletId = project?.wallet?.id

  const { data: accounts } = trpc.account.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  const { data: transactions } = trpc.transaction.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  const utils = trpc.useUtils()
  const removeMemberMutation = trpc.project.removeMember.useMutation({
    onSuccess: () => void utils.project.get.invalidate({ id }),
  })

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER')

  const inviteMutation = trpc.project.invite.useMutation({
    onSuccess: () => {
      void utils.project.get.invalidate({ id })
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('VIEWER')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="font-medium">Пространство не найдено</p>
        <Button variant="link" onClick={() => router.push('/projects')}>
          Вернуться к списку
        </Button>
      </div>
    )
  }

  const currency = project.wallet?.currency ?? 'RUB'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{project.icon ?? '💼'}</span>
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Настройки
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="accounts">Счета</TabsTrigger>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
        </TabsList>

        {/* Обзор */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {!dashboard ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Доходы</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmount(dashboard.revenue, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">За текущий месяц</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Расходы</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatAmount(dashboard.expenses, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">За текущий месяц</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Прибыль</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${dashboard.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatAmount(dashboard.profit, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Маржа: {dashboard.profitMargin}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Счета */}
        <TabsContent value="accounts" className="mt-4">
          {!accounts ? (
            <Skeleton className="h-40 w-full" />
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <CreditCard className="h-8 w-8 mb-2" />
              <p className="font-medium">Нет счетов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.type}</p>
                    </div>
                    <span className={`font-semibold ${Number(account.balance) < 0 ? 'text-destructive' : ''}`}>
                      {formatAmount(Number(account.balance), currency)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Транзакции */}
        <TabsContent value="transactions" className="mt-4">
          {!transactions ? (
            <Skeleton className="h-40 w-full" />
          ) : transactions.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <ArrowLeftRight className="h-8 w-8 mb-2" />
              <p className="font-medium">Нет транзакций</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.items.map((tx: (typeof transactions.items)[0]) => (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{tx.description ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-destructive' : ''
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {formatAmount(Number(tx.amount), currency)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Участники */}
        <TabsContent value="members" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Пригласить
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Пригласить участника</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      inviteMutation.mutate({ projectId: id, email: inviteEmail, role: inviteRole })
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Роль</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER">Зритель</SelectItem>
                          <SelectItem value="EDITOR">Редактор</SelectItem>
                          <SelectItem value="ADMIN">Администратор</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {inviteMutation.error && (
                      <p className="text-sm text-destructive">{inviteMutation.error.message}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? 'Отправка...' : 'Пригласить'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {project.members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                        {member.user.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.user.name ?? member.user.email}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{member.role}</Badge>
                      {member.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            removeMemberMutation.mutate({ projectId: id, userId: member.user.id })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
