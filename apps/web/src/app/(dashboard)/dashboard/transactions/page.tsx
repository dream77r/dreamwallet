'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  MoreHorizontal,
  SlidersHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type TransactionType = 'income' | 'expense' | 'transfer'

interface Transaction {
  id: number
  date: string
  description: string
  category: string
  account: string
  amount: number
  type: TransactionType
}

const mockTransactions: Transaction[] = [
  { id: 1, date: '25.02.2026', description: 'Зарплата', category: 'Доходы', account: 'Сбербанк', amount: 107000, type: 'income' },
  { id: 2, date: '25.02.2026', description: 'Перекрёсток', category: 'Продукты', account: 'Тинькофф', amount: -3450, type: 'expense' },
  { id: 3, date: '24.02.2026', description: 'Яндекс.Такси', category: 'Транспорт', account: 'Тинькофф', amount: -450, type: 'expense' },
  { id: 4, date: '24.02.2026', description: 'Кофе Хауз', category: 'Кафе и рестораны', account: 'Тинькофф', amount: -680, type: 'expense' },
  { id: 5, date: '23.02.2026', description: 'Netflix', category: 'Развлечения', account: 'Тинькофф', amount: -799, type: 'expense' },
  { id: 6, date: '22.02.2026', description: 'ВкусВилл', category: 'Продукты', account: 'Тинькофф', amount: -2180, type: 'expense' },
  { id: 7, date: '22.02.2026', description: 'Перевод на накопительный', category: 'Переводы', account: 'Сбербанк', amount: -20000, type: 'transfer' },
  { id: 8, date: '21.02.2026', description: 'Freelance — дизайн', category: 'Фриланс', account: 'Тинькофф', amount: 15000, type: 'income' },
  { id: 9, date: '21.02.2026', description: 'Lamoda', category: 'Одежда', account: 'Тинькофф', amount: -4290, type: 'expense' },
  { id: 10, date: '20.02.2026', description: 'Ростелеком — интернет', category: 'Коммунальные', account: 'Сбербанк', amount: -690, type: 'expense' },
  { id: 11, date: '19.02.2026', description: 'Аптека 36.6', category: 'Здоровье', account: 'Тинькофф', amount: -1230, type: 'expense' },
  { id: 12, date: '19.02.2026', description: 'Дивиденды ОФЗ', category: 'Инвестиции', account: 'Тинькофф Инвест', amount: 3200, type: 'income' },
  { id: 13, date: '18.02.2026', description: 'Metro Cash&Carry', category: 'Продукты', account: 'Тинькофф', amount: -6780, type: 'expense' },
  { id: 14, date: '17.02.2026', description: 'Gym — абонемент', category: 'Спорт', account: 'Тинькофф', amount: -3500, type: 'expense' },
  { id: 15, date: '17.02.2026', description: 'Кэшбэк февраль', category: 'Кэшбэк', account: 'Тинькофф', amount: 870, type: 'income' },
]

const PAGE_SIZE = 10

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

const typeLabels: Record<TransactionType, string> = {
  income: 'Доход',
  expense: 'Расход',
  transfer: 'Перевод',
}

const typeBadgeVariants: Record<TransactionType, string> = {
  income: 'bg-green-100 text-green-700',
  expense: 'bg-red-100 text-red-700',
  transfer: 'bg-blue-100 text-blue-700',
}

const typeIcons: Record<TransactionType, React.ReactNode> = {
  income: <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />,
  expense: <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />,
  transfer: <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />,
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const categories = Array.from(new Set(mockTransactions.map((t) => t.category))).sort()

  const filtered = mockTransactions.filter((tx) => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || tx.type === typeFilter
    const matchCategory = categoryFilter === 'all' || tx.category === categoryFilter
    return matchSearch && matchType && matchCategory
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Транзакции</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} записей</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Доходы</p>
            <p className="text-lg font-semibold text-green-600">+{formatAmount(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Расходы</p>
            <p className="text-lg font-semibold text-red-600">-{formatAmount(Math.abs(totalExpense))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Итого</p>
            <p className={`text-lg font-semibold ${totalIncome + totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalIncome + totalExpense >= 0 ? '+' : ''}{formatAmount(totalIncome + totalExpense)}
            </p>
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
                placeholder="Поиск по описанию или категории..."
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
                <SelectItem value="income">Доходы</SelectItem>
                <SelectItem value="expense">Расходы</SelectItem>
                <SelectItem value="transfer">Переводы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
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
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Транзакции не найдены
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6 text-muted-foreground text-sm">{tx.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          tx.type === 'income' ? 'bg-green-100' :
                          tx.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {typeIcons[tx.type]}
                        </div>
                        <span className="font-medium text-sm">{tx.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.account}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeVariants[tx.type]}`}>
                        {typeLabels[tx.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className={`font-semibold text-sm ${
                        tx.amount > 0 ? 'text-green-600' : tx.type === 'transfer' ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {tx.amount > 0 ? '+' : '-'}{formatAmount(tx.amount)}
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
                          <DropdownMenuItem>Дублировать</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Удалить</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length === 0 ? 'Нет записей' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} из ${filtered.length}`}
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
