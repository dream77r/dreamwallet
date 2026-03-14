'use client'

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { AccountForm } from '@/components/accounts/account-form'
import { PageHeader } from '@/components/ui/page-header'
import { GradientHero, HeroStat } from '@/components/ui/gradient-hero'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'

function pluralize(n: number, one: string, two: string, five: string): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return five
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return two
  return five
}

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

const typeGradients: Record<AccountType, string> = {
  BANK_ACCOUNT: 'from-blue-500 to-blue-600',
  SAVINGS: 'from-emerald-500 to-emerald-600',
  INVESTMENT: 'from-purple-500 to-purple-600',
  CASH: 'from-amber-500 to-amber-600',
  CREDIT_CARD: 'from-rose-500 to-rose-600',
  CRYPTO: 'from-teal-500 to-teal-600',
  CUSTOM: 'from-gray-500 to-gray-600',
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

  const accountCount = accounts?.length ?? 0
  const descriptionText = isLoading
    ? 'Загрузка...'
    : `${accountCount} ${pluralize(accountCount, 'счёт', 'счёта', 'счетов')} и кошельков`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Счета"
        description={descriptionText}
        actions={wallet && <AccountForm walletId={wallet.id} />}
      />

      {/* Net worth hero */}
      <GradientHero variant="default">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28 bg-white/20" />
            <Skeleton className="h-10 w-48 bg-white/20" />
            <div className="flex gap-6 mt-4">
              <Skeleton className="h-12 w-28 bg-white/20" />
              <Skeleton className="h-12 w-28 bg-white/20" />
            </div>
          </div>
        ) : (
          <>
            <HeroStat label="Чистый капитал" value={formatAmount(netWorth)} />
            <div className="flex gap-6 mt-4">
              <div>
                <span className="text-sm opacity-80">Активы</span>
                <p className="text-lg font-bold">+{formatAmount(totalAssets)}</p>
              </div>
              <div>
                <span className="text-sm opacity-80">Долги</span>
                <p className="text-lg font-bold">-{formatAmount(Math.abs(totalDebt))}</p>
              </div>
            </div>
          </>
        )}
      </GradientHero>

      {/* Edit form (controlled) */}
      {editingAccount && wallet && (
        <AccountForm
          walletId={wallet.id}
          initialData={{
            id: editingAccount.id,
            name: editingAccount.name,
            type: editingAccount.type as 'BANK_ACCOUNT' | 'CASH' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CRYPTO' | 'CUSTOM',
            currency: editingAccount.currency,
          }}
          open={!!editingId}
          onOpenChange={(o) => { if (!o) setEditingId(null) }}
        />
      )}

      {/* Onboarding */}
      {!isLoading && accountCount === 0 && wallet && (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 border border-dashed text-muted-foreground">
          <div className="text-4xl mb-3">💳</div>
          <p className="font-medium text-foreground mb-1">Добавьте первый счёт</p>
          <p className="text-sm mb-4">Счёт — это банковская карта, наличные или кошелёк</p>
          <AccountForm walletId={wallet.id} />
        </div>
      )}

      {/* Account cards grid */}
      <StaggerList className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl overflow-hidden">
              <div className="h-24 bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-40" />
              </div>
            </div>
          ))
        ) : (
          <>
            {accounts?.map((account) => {
              const type = account.type as AccountType
              const balance = Number(account.balance)
              const gradient = typeGradients[type]

              return (
                <StaggerItem key={account.id}>
                  <div className="glass-card rounded-2xl overflow-hidden card-hover">
                    {/* Gradient header section */}
                    <div className={`bg-gradient-to-br ${gradient} p-5 text-white`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                            <TypeIcon type={type} />
                          </div>
                          <div>
                            <p className="font-semibold text-base leading-tight">{account.name}</p>
                            <p className="text-xs opacity-80 mt-0.5">{typeLabels[type]}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingId(account.id)}>
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-expense"
                              onClick={() => archiveMutation.mutate({ id: account.id })}
                            >
                              Архивировать
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Balance section */}
                    <div className="p-5">
                      <p className="text-xs text-muted-foreground mb-1">Текущий баланс</p>
                      <p className={`text-2xl font-bold ${balance < 0 ? 'text-expense' : 'text-foreground'}`}>
                        {formatAmount(balance, account.currency)}
                      </p>
                      {account.wallet?.name && (
                        <Badge variant="secondary" className="mt-3 text-xs">
                          {account.wallet.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              )
            })}

            {/* Add account card */}
            <StaggerItem>
              <div className="glass-card rounded-2xl border-2 border-dashed flex items-center justify-center min-h-[180px] card-hover cursor-pointer transition-colors hover:border-primary/50">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/40">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Добавить счёт</p>
                </div>
              </div>
            </StaggerItem>
          </>
        )}
      </StaggerList>
    </div>
  )
}
