'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  UserPlus,
  Trash2,
  Plus,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { PayoutDialog } from '@/components/projects/PayoutDialog'
import { useSession } from '@/lib/auth-client'

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

function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()

  const { data: project, isLoading } = trpc.project.get.useQuery({ id })
  const { data: dashboard } = trpc.project.getDashboard.useQuery({ id })
  const { data: unseenCount } = trpc.project.getUnseenCount.useQuery({ projectId: id })

  const walletId = project?.wallet?.id

  const { data: accounts } = trpc.account.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  const { data: transactions } = trpc.transaction.list.useQuery(
    { walletId: walletId! },
    { enabled: !!walletId }
  )

  // Income tab
  const [incomePeriod, setIncomePeriod] = useState(getCurrentPeriod())
  const { data: distribution } = trpc.income.getDistribution.useQuery(
    { projectId: id, period: incomePeriod },
    { enabled: !!project }
  )

  // Payout dialog
  const [payoutTarget, setPayoutTarget] = useState<{
    memberId: string
    memberName: string
    balance: number
  } | null>(null)

  const utils = trpc.useUtils()

  // Mark seen
  const markSeenMutation = trpc.project.markSeen.useMutation({
    onSuccess: () => void utils.project.getUnseenCount.invalidate({ projectId: id }),
  })

  const handleTransactionsTab = useCallback(() => {
    markSeenMutation.mutate({ projectId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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

  // Add expense dialog
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))

  const addExpenseMutation = trpc.project.addExpense.useMutation({
    onSuccess: () => {
      void utils.transaction.list.invalidate()
      void utils.project.getDashboard.invalidate({ id })
      void utils.account.list.invalidate()
      setExpenseOpen(false)
      setExpenseAmount('')
      setExpenseDesc('')
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
  const currentUserId = session?.user?.id
  const myMember = project.members.find(m => m.user.id === currentUserId)
  const isOwner = project.ownerId === currentUserId
  const canEdit = myMember && myMember.role !== 'VIEWER'

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
      <Tabs defaultValue="overview" onValueChange={(v) => {
        if (v === 'transactions') handleTransactionsTab()
      }}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="accounts">Счета</TabsTrigger>
          <TabsTrigger value="transactions" className="relative">
            Транзакции
            {(unseenCount ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                {unseenCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
          <TabsTrigger value="income">Доход</TabsTrigger>
        </TabsList>

        {/* Обзор */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {!dashboard ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="glass-card card-default rounded-2xl">
                <div className="flex flex-row items-center justify-between p-5 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">Доходы</p>
                  <TrendingUp className="h-4 w-4 text-income" />
                </div>
                <div className="px-5 pb-5">
                  <div className="text-2xl font-bold text-income">
                    {formatAmount(dashboard.revenue, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">За текущий месяц</p>
                </div>
              </div>
              <div className="glass-card card-default rounded-2xl">
                <div className="flex flex-row items-center justify-between p-5 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">Расходы</p>
                  <TrendingDown className="h-4 w-4 text-expense" />
                </div>
                <div className="px-5 pb-5">
                  <div className="text-2xl font-bold text-expense">
                    {formatAmount(dashboard.expenses, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">За текущий месяц</p>
                </div>
              </div>
              <div className="glass-card card-default rounded-2xl">
                <div className="flex flex-row items-center justify-between p-5 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">Прибыль</p>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="px-5 pb-5">
                  <div className={`text-2xl font-bold ${dashboard.profit >= 0 ? 'text-primary' : 'text-expense'}`}>
                    {formatAmount(dashboard.profit, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Маржа: {dashboard.profitMargin}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Счета */}
        <TabsContent value="accounts" className="mt-4">
          {!accounts ? (
            <Skeleton className="h-40 w-full" />
          ) : accounts.length === 0 ? (
            <div className="glass-card card-default rounded-2xl flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed">
              <CreditCard className="h-8 w-8 mb-2" />
              <p className="font-medium">Нет счетов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="glass-card card-default rounded-2xl">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.type}</p>
                    </div>
                    <span className={`font-semibold ${Number(account.balance) < 0 ? 'text-expense' : ''}`}>
                      {formatAmount(Number(account.balance), currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Транзакции */}
        <TabsContent value="transactions" className="mt-4 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Расход
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Добавить расход</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      addExpenseMutation.mutate({
                        projectId: id,
                        amount: parseFloat(expenseAmount),
                        description: expenseDesc || undefined,
                        date: new Date(expenseDate),
                      })
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>Сумма</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Описание</Label>
                      <Input
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        placeholder="За что"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Дата</Label>
                      <Input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        required
                      />
                    </div>
                    {addExpenseMutation.error && (
                      <p className="text-sm text-destructive">{addExpenseMutation.error.message}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={addExpenseMutation.isPending}>
                        {addExpenseMutation.isPending ? 'Сохранение...' : 'Добавить'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!transactions ? (
            <Skeleton className="h-40 w-full" />
          ) : transactions.items.length === 0 ? (
            <div className="glass-card card-default rounded-2xl flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed">
              <ArrowLeftRight className="h-8 w-8 mb-2" />
              <p className="font-medium">Нет транзакций</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.items.map((tx: (typeof transactions.items)[0]) => {
                const txWith = tx as typeof tx & {
                  createdBy?: { id: string; name: string | null } | null
                }
                const isNewFromOther = Boolean(
                  txWith.createdBy &&
                  txWith.createdBy.id !== currentUserId
                )
                const createdByName = txWith.createdBy?.name ?? ''

                return (
                  <div
                    key={tx.id}
                    className={`glass-card rounded-2xl ${isNewFromOther ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'card-default'}`}
                  >
                    <div className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{tx.description ?? '—'}</p>
                          {isNewFromOther && createdByName && (
                            <span className="text-xs text-primary">
                              {createdByName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          tx.type === 'INCOME' ? 'text-income' : tx.type === 'EXPENSE' ? 'text-expense' : ''
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                        {formatAmount(Number(tx.amount), currency)}
                      </span>
                    </div>
                  </div>
                )
              })}
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
                <div key={member.id} className="glass-card card-default rounded-2xl">
                  <div className="flex items-center justify-between px-5 py-3">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Доход */}
        <TabsContent value="income" className="mt-4 space-y-4">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Label>Период:</Label>
            <Input
              type="month"
              value={incomePeriod}
              onChange={(e) => setIncomePeriod(e.target.value)}
              className="w-auto"
            />
          </div>

          {!distribution ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="glass-card card-default rounded-2xl">
                  <div className="flex flex-row items-center justify-between p-5 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">Выручка</p>
                    <TrendingUp className="h-4 w-4 text-income" />
                  </div>
                  <div className="px-5 pb-5">
                    <div className="text-2xl font-bold text-income">
                      {formatAmount(distribution.revenue, currency)}
                    </div>
                  </div>
                </div>
                <div className="glass-card card-default rounded-2xl">
                  <div className="flex flex-row items-center justify-between p-5 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">К распределению</p>
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div className="px-5 pb-5">
                    <div className="text-2xl font-bold">
                      {formatAmount(distribution.revenue - distribution.totalFixed, currency)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      После фикс. выплат ({formatAmount(distribution.totalFixed, currency)})
                    </p>
                  </div>
                </div>
                <div className="glass-card card-default rounded-2xl">
                  <div className="flex flex-row items-center justify-between p-5 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">Остаток владельца</p>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="px-5 pb-5">
                    {(() => {
                      const ownerDist = distribution.distribution.find(d => d.role === 'OWNER')
                      const ownerEarned = ownerDist?.earned ?? 0
                      return (
                        <div className={`text-2xl font-bold ${ownerEarned >= 0 ? 'text-primary' : 'text-expense'}`}>
                          {formatAmount(ownerEarned, currency)}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Distribution table */}
              <div className="glass-card card-default rounded-2xl">
                <div className="p-5 pb-3">
                  <h3 className="font-semibold text-base">Распределение</h3>
                </div>
                <div className="px-5 pb-5">
                  <div className="space-y-3">
                    {distribution.distribution.map((d) => (
                      <div key={d.memberId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{d.name}</p>
                            <div className="flex items-center gap-1.5">
                              {d.ruleType === 'PERCENTAGE' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{d.ruleValue}%</Badge>
                              )}
                              {d.ruleType === 'FIXED' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {formatAmount(d.ruleValue ?? 0, currency)}
                                </Badge>
                              )}
                              {d.role === 'OWNER' && !d.ruleType && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">Остаток</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-medium">{formatAmount(d.earned, currency)}</p>
                            <p className="text-xs text-muted-foreground">
                              Выплачено: {formatAmount(d.paid, currency)}
                            </p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className={`font-semibold ${d.balance > 0 ? 'text-orange-600' : d.balance < 0 ? 'text-expense' : 'text-income'}`}>
                              {d.balance > 0 ? formatAmount(d.balance, currency) : d.balance < 0 ? formatAmount(d.balance, currency) : 'Оплачено'}
                            </p>
                          </div>
                          {isOwner && d.balance > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPayoutTarget({
                                memberId: d.memberId,
                                memberName: d.name,
                                balance: d.balance,
                              })}
                            >
                              Выплатить
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Payout dialog */}
      {payoutTarget && (
        <PayoutDialog
          open={!!payoutTarget}
          onOpenChange={(open) => { if (!open) setPayoutTarget(null) }}
          projectId={id}
          memberId={payoutTarget.memberId}
          memberName={payoutTarget.memberName}
          balance={payoutTarget.balance}
          period={incomePeriod}
          currency={currency}
        />
      )}
    </div>
  )
}
