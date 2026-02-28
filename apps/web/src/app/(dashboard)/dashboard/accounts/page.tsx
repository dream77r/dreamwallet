'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  CreditCard,
  Landmark,
  TrendingUp,
  Wallet,
  Banknote,
  MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { AccountForm } from '@/components/accounts/account-form'

type AccountType = 'BANK_ACCOUNT' | 'CASH' | 'CRYPTO' | 'INVESTMENT' | 'CREDIT_CARD' | 'SAVINGS' | 'CUSTOM'

const typeLabels: Record<AccountType, string> = {
  BANK_ACCOUNT: 'Расчётный',
  SAVINGS: 'Накопительный',
  INVESTMENT: 'Инвестиции',
  CASH: 'Наличные',
  CREDIT_CARD: 'Кредитный',
  CRYPTO: 'Крипто',
  CUSTOM: 'Другой',
}

const typeColors: Record<AccountType, string> = {
  BANK_ACCOUNT: 'bg-yellow-500',
  SAVINGS: 'bg-blue-500',
  INVESTMENT: 'bg-purple-500',
  CASH: 'bg-orange-500',
  CREDIT_CARD: 'bg-red-500',
  CRYPTO: 'bg-teal-500',
  CUSTOM: 'bg-gray-500',
}

function TypeIcon({ type }: { type: AccountType }) {
  const cls = 'h-5 w-5'
  switch (type) {
    case 'BANK_ACCOUNT': return <CreditCard className={cls} />
    case 'SAVINGS': return <Landmark className={cls} />
    case 'INVESTMENT': return <TrendingUp className={cls} />
    case 'CASH': return <Banknote className={cls} />
    case 'CREDIT_CARD': return <CreditCard className={cls} />
    default: return <Wallet className={cls} />
  }
}

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AccountsPage() {
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: wallet } = trpc.wallet.get.useQuery()
  const { data: accounts, isLoading } = trpc.account.listAll.useQuery()
  const utils = trpc.useUtils()

  const archiveMutation = trpc.account.archive.useMutation({
    onSuccess: () => { toast.success('Счёт архивирован'); void utils.account.listAll.invalidate() },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  const editingAccount = accounts?.find(a => a.id === editingId)

  const totalAssets = accounts?.filter(a => Number(a.balance) > 0).reduce((s, a) => s + Number(a.balance), 0) ?? 0
  const totalDebt = accounts?.filter(a => Number(a.balance) < 0).reduce((s, a) => s + Number(a.balance), 0) ?? 0
  const netWorth = totalAssets + totalDebt

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Счета</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : `${accounts?.length ?? 0} счетов и кошельков`}
          </p>
        </div>
        {wallet && <AccountForm walletId={wallet.id} />}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Чистый капитал</p>
            {isLoading ? <Skeleton className="h-6 w-32" /> : (
              <p className="text-xl font-semibold">{formatAmount(netWorth)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Всего активов</p>
            {isLoading ? <Skeleton className="h-6 w-32" /> : (
              <p className="text-xl font-semibold text-green-600">{formatAmount(totalAssets)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Общий долг</p>
            {isLoading ? <Skeleton className="h-6 w-32" /> : (
              <p className="text-xl font-semibold text-red-600">{formatAmount(Math.abs(totalDebt))}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit form (controlled) */}
      {editingAccount && wallet && (
        <AccountForm
          walletId={wallet.id}
          initialData={{ id: editingAccount.id, name: editingAccount.name, type: editingAccount.type as 'BANK_ACCOUNT' | 'CASH' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CRYPTO' | 'CUSTOM', currency: editingAccount.currency }}
          open={!!editingId}
          onOpenChange={(o) => { if (!o) setEditingId(null) }}
        />
      )}

      {/* Onboarding */}
      {!isLoading && accounts?.length === 0 && wallet && (
        <Card className="flex flex-col items-center justify-center py-16 border-dashed text-muted-foreground">
          <div className="text-4xl mb-3">💳</div>
          <p className="font-medium text-foreground mb-1">Добавьте первый счёт</p>
          <p className="text-sm mb-4">Счёт — это банковская карта, наличные или кошелёк</p>
          <AccountForm walletId={wallet.id} />
        </Card>
      )}

      {/* Account cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3 pt-7">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-40" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {accounts?.map((account) => {
              const type = account.type as AccountType
              const balance = Number(account.balance)
              const color = account.color ? `bg-[${account.color}]` : typeColors[type]

              return (
                <Card key={account.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${typeColors[type]}`} />
                  <CardHeader className="pb-3 pt-7">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${typeColors[type]} text-white`}>
                          <TypeIcon type={type} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {account.wallet?.name ?? typeLabels[type]}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {typeLabels[type]}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingId(account.id)}>Редактировать</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => archiveMutation.mutate({ id: account.id })}>Архивировать</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Separator className="mb-4" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Текущий баланс</p>
                      <p className={`text-2xl font-semibold ${balance < 0 ? 'text-red-600' : ''}`}>
                        {formatAmount(balance, account.currency)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Add account card */}
            <Card className="flex items-center justify-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors min-h-[200px]">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Добавить счёт</p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
