'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
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
import { TransactionForm } from '@/components/transactions/transaction-form'

const PAGE_SIZE = 20

type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

const typeLabels: Record<TxType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
  TRANSFER: 'Перевод',
}

const typeBadgeVariants: Record<TxType, string> = {
  INCOME: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-red-100 text-red-700',
  TRANSFER: 'bg-blue-100 text-blue-700',
}

const typeIcons: Record<TxType, React.ReactNode> = {
  INCOME: <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />,
  EXPENSE: <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />,
  TRANSFER: <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />,
}

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const utils = trpc.useUtils()

  // Fetch transactions with filters
  const { data, isLoading } = trpc.transaction.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'date',
    sortOrder: 'desc',
    ...(search ? { search } : {}),
    ...(typeFilter !== 'all' ? { type: typeFilter as TxType } : {}),
    ...(categoryFilter !== 'all' ? { categoryId: categoryFilter } : {}),
  })

  // Fetch categories for filter dropdown
  const { data: categories } = trpc.category.list.useQuery()

  // Delete mutation
  const deleteMutation = trpc.transaction.delete.useMutation({
    onSuccess: () => {
      toast.success('Транзакция удалена')
      void utils.transaction.list.invalidate()
    },
    onError: (err) => {
      toast.error(`Ошибка: ${err.message}`)
    },
  })

  const transactions = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Summary from current page data
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0)
  const net = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Транзакции</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : `${total} записей`}
          </p>
        </div>
        <TransactionForm />
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Доходы</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold text-green-600">+{formatAmount(totalIncome)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Расходы</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold text-red-600">-{formatAmount(totalExpense)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Итого</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className={`text-lg font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {net >= 0 ? '+' : '-'}{formatAmount(net)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по описанию или контрагенту..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="INCOME">Доходы</SelectItem>
                <SelectItem value="EXPENSE">Расходы</SelectItem>
                <SelectItem value="TRANSFER">Переводы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 w-[110px]">Дата</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Счёт</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right pr-6">Сумма</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Транзакции не найдены
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const type = tx.type as TxType
                  const amount = Number(tx.amount)
                  const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })
                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/50">
                      <TableCell className="pl-6 text-muted-foreground text-sm">{dateLabel}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                            type === 'INCOME' ? 'bg-green-100' :
                            type === 'EXPENSE' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {typeIcons[type]}
                          </div>
                          <span className="font-medium text-sm">
                            {tx.description || tx.counterparty || typeLabels[type]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.category?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.account.name}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeVariants[type]}`}>
                          {typeLabels[type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className={`font-semibold text-sm ${
                          type === 'INCOME' ? 'text-green-600' :
                          type === 'TRANSFER' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {type === 'INCOME' ? '+' : '-'}{formatAmount(amount, tx.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Редактировать</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate({ id: tx.id })}
                            >
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? 'Нет записей' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} из ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2)
            .map(p => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
