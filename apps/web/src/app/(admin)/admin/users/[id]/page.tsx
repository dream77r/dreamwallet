'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc/client'
import { ArrowLeft, Shield, ShieldOff, Trash2, CreditCard } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useState } from 'react'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatBalance(amount: number | string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const utils = trpc.useUtils()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: user, isLoading } = trpc.admin.getUser.useQuery({ id })

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: (data) => {
      toast.success(`Роль изменена на ${data.role}`)
      utils.admin.getUser.invalidate({ id })
      utils.admin.listUsers.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('Пользователь удалён')
      router.push('/admin/users')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Пользователь не найден</p>
        <Button variant="outline" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
      </div>
    )
  }

  const subscription = user.subscriptions[0]
  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{user.name || user.email}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={isAdmin ? 'default' : 'outline'} className="text-sm">
            {user.role}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {subscription?.plan ?? 'FREE'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Имя</p>
                <p className="font-medium">{user.name || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Валюта</p>
                <p className="font-medium">{user.currency}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Часовой пояс</p>
                <p className="font-medium">{user.timezone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Регистрация</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email подтверждён</p>
                <p className="font-medium">{user.emailVerified ? 'Да' : 'Нет'}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Транзакции</p>
                <p className="text-lg font-semibold">{user.transactionCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Категории</p>
                <p className="text-lg font-semibold">{user._count.categories}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Проекты</p>
                <p className="text-lg font-semibold">{user._count.projects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={isAdmin ? 'outline' : 'default'}
              className="w-full justify-start"
              onClick={() =>
                updateRole.mutate({
                  id: user.id,
                  role: isAdmin ? 'USER' : 'ADMIN',
                })
              }
              disabled={updateRole.isPending}
            >
              {isAdmin ? (
                <>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Снять роль админа
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Назначить админом
                </>
              )}
            </Button>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить пользователя
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Удалить пользователя?</DialogTitle>
                  <DialogDescription>
                    Все данные пользователя <strong>{user.email}</strong> будут
                    удалены безвозвратно: транзакции, счета, кошельки, проекты.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteUser.mutate({ id: user.id })}
                    disabled={deleteUser.isPending}
                  >
                    {deleteUser.isPending ? 'Удаление...' : 'Удалить'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Accounts */}
      {user.personalWallet?.accounts && user.personalWallet.accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Счета</CardTitle>
            <CardDescription>
              Кошелёк: {user.personalWallet.name} ({user.personalWallet.currency})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {user.personalWallet.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatBalance(acc.balance.toString())}</p>
                    {acc.isArchived && (
                      <Badge variant="outline" className="text-xs">
                        Архив
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
