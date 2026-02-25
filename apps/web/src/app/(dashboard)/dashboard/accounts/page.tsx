'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  CreditCard,
  Landmark,
  TrendingUp,
  Wallet,
  Smartphone,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'credit'

interface Account {
  id: number
  name: string
  bank: string
  type: AccountType
  balance: number
  currency: string
  lastTransaction: string
  lastAmount: number
  color: string
}

const mockAccounts: Account[] = [
  {
    id: 1,
    name: 'Основная карта',
    bank: 'Тинькофф',
    type: 'checking',
    balance: 48320,
    currency: 'RUB',
    lastTransaction: '25 фев',
    lastAmount: -3450,
    color: 'bg-yellow-500',
  },
  {
    id: 2,
    name: 'Зарплатный счёт',
    bank: 'Сбербанк',
    type: 'checking',
    balance: 187600,
    currency: 'RUB',
    lastTransaction: '25 фев',
    lastAmount: 107000,
    color: 'bg-green-600',
  },
  {
    id: 3,
    name: 'Накопительный',
    bank: 'Сбербанк',
    type: 'savings',
    balance: 340000,
    currency: 'RUB',
    lastTransaction: '22 фев',
    lastAmount: 20000,
    color: 'bg-blue-500',
  },
  {
    id: 4,
    name: 'Инвестиции',
    bank: 'Тинькофф Инвест',
    type: 'investment',
    balance: 125430,
    currency: 'RUB',
    lastTransaction: '19 фев',
    lastAmount: 3200,
    color: 'bg-purple-500',
  },
  {
    id: 5,
    name: 'Наличные',
    bank: 'Кошелёк',
    type: 'cash',
    balance: 8500,
    currency: 'RUB',
    lastTransaction: '20 фев',
    lastAmount: -1200,
    color: 'bg-orange-500',
  },
  {
    id: 6,
    name: 'Кредитная карта',
    bank: 'Тинькофф',
    type: 'credit',
    balance: -15600,
    currency: 'RUB',
    lastTransaction: '24 фев',
    lastAmount: -4290,
    color: 'bg-red-500',
  },
]

const typeLabels: Record<AccountType, string> = {
  checking: 'Расчётный',
  savings: 'Накопительный',
  investment: 'Инвестиции',
  cash: 'Наличные',
  credit: 'Кредитный',
}

const typeIcons: Record<AccountType, React.ReactNode> = {
  checking: <CreditCard className="h-5 w-5" />,
  savings: <Landmark className="h-5 w-5" />,
  investment: <TrendingUp className="h-5 w-5" />,
  cash: <Wallet className="h-5 w-5" />,
  credit: <Smartphone className="h-5 w-5" />,
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AccountsPage() {
  const totalAssets = mockAccounts
    .filter(a => a.balance > 0)
    .reduce((s, a) => s + a.balance, 0)
  const totalDebt = mockAccounts
    .filter(a => a.balance < 0)
    .reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets + totalDebt

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Счета</h1>
          <p className="text-muted-foreground text-sm">{mockAccounts.length} счетов и кошельков</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Добавить счёт
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Чистый капитал</p>
            <p className="text-xl font-semibold">{formatAmount(netWorth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Всего активов</p>
            <p className="text-xl font-semibold text-green-600">{formatAmount(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Общий долг</p>
            <p className="text-xl font-semibold text-red-600">{formatAmount(Math.abs(totalDebt))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Account cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockAccounts.map((account) => (
          <Card key={account.id} className="relative overflow-hidden">
            {/* Colored accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${account.color}`} />

            <CardHeader className="pb-3 pt-7">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${account.color} text-white`}>
                    {typeIcons[account.type]}
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription className="text-xs">{account.bank}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {typeLabels[account.type]}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Редактировать</DropdownMenuItem>
                      <DropdownMenuItem>История транзакций</DropdownMenuItem>
                      <DropdownMenuItem>Перевод</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Удалить</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Separator className="mb-4" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Текущий баланс</p>
                  <p className={`text-2xl font-semibold ${account.balance < 0 ? 'text-red-600' : ''}`}>
                    {formatAmount(account.balance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Последняя операция</p>
                  <div className="flex items-center gap-1 justify-end">
                    {account.lastAmount > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${account.lastAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {account.lastAmount > 0 ? '+' : ''}{formatAmount(account.lastAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{account.lastTransaction}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add account card */}
        <Card className="flex items-center justify-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors min-h-[200px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Добавить счёт</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
