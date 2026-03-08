'use client'
import { Suspense } from 'react'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  MoreHorizontal,
  Trash2,
  Tag,
  X,
  Download,
  Camera,
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
import { QuickAddModal } from '@/components/transactions/QuickAddModal'

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

function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setQuickAddOpen(true)
    }
  }, [searchParams])

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  const utils = trpc.useUtils()

  // CSV export
  const exportQuery = trpc.transaction.export.useQuery(
    { format: 'csv' },
    { enabled: false }
  )

  const parseReceiptMutation = trpc.ai.parseReceipt.useMutation({
    onSuccess: (data) => {
      if (data && data.amount > 0) {
        toast.success(`Распознано: ${data.description} — ${data.amount}₽`)
      } else {
        toast.error('Не удалось распознать чек')
      }
    },
    onError: () => toast.error('Ошибка при сканировании'),
  })

  const handleScanReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      parseReceiptMutation.mutate({ imageBase64: base64 })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleExport = async () => {
    const result = await exportQuery.refetch()
    if (result.data) {
      const blob = new Blob([result.data.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.data.filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Fetch transactions with filters
  const { data, isLoading } = trpc.transaction.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'date',
    sortOrder: 'desc',
    ...(search ? { search } : {}),
    ...(typeFilter !== 'all' ? { type: typeFilter as TxType } : {}),
    ...(categoryFilter !== 'all' ? { categoryId: categoryFilter } : {}),
    ...(tagFilter ? { tags: [tagFilter] } : {}),
  })

  // Fetch categories for filter dropdown
  const { data: categories } = trpc.category.list.useQuery()

  // Fetch tags for filter dropdown
  const { data: tags } = trpc.tags.list.useQuery()

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

  // Bulk update mutation (for category change)
  const updateMutation = trpc.transaction.update.useMutation()

  // Bulk helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === transactions.length && transactions.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)))
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setBulkCategoryId('')
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    let deleted = 0
    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync({ id })
        deleted++
      } catch { /* skip */ }
    }
    toast.success(`Удалено ${deleted} транзакций`)
    clearSelection()
    void utils.transaction.list.invalidate()
  }

  async function handleBulkCategory() {
    if (!bulkCategoryId) return
    const ids = Array.from(selectedIds)
    let updated = 0
    for (const id of ids) {
      try {
        await updateMutation.mutateAsync({ id, categoryId: bulkCategoryId })
        updated++
      } catch { /* skip */ }
    }
    toast.success(`Обновлено ${updated} транзакций`)
    setBulkCategoryOpen(false)
    clearSelection()
    void utils.transaction.list.invalidate()
  }

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

  const editingTx = transactions.find(t => t.id === editingId)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      {editingTx && (
        <TransactionForm
          initialData={{ id: editingTx.id, type: editingTx.type as 'INCOME' | 'EXPENSE' | 'TRANSFER', accountId: editingTx.accountId, amount: editingTx.amount, date: editingTx.date, description: editingTx.description, categoryId: editingTx.categoryId }}
          open={!!editingId}
          onOpenChange={(o) => { if (!o) setEditingId(null) }}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Транзакции</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : `${total} записей`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanReceipt} />
            <Button variant="outline" size="sm" asChild disabled={parseReceiptMutation.isPending}>
              <span>
                <Camera className="h-4 w-4 mr-2" />
                {parseReceiptMutation.isPending ? 'Сканирую...' : 'Чек'}
              </span>
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exportQuery.isFetching}>
            <Download className="h-4 w-4 mr-2" />
            {exportQuery.isFetching ? 'Экспорт...' : 'CSV'}
          </Button>
          <TransactionForm />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-white rounded-2xl shadow-sm border-0">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Доходы</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-xl font-bold tabular-nums text-green-600">+{formatAmount(totalIncome)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl shadow-sm border-0">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Расходы</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-xl font-bold tabular-nums text-red-500">-{formatAmount(totalExpense)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl shadow-sm border-0">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Итого</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {net >= 0 ? '+' : '-'}{formatAmount(net)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white rounded-2xl shadow-sm border-0">
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
            <Select value={tagFilter || 'all'} onValueChange={(v) => { setTagFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Тег" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все теги</SelectItem>
                {tags?.map((tag) => (
                  <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || typeFilter !== 'all' || categoryFilter !== 'all' || tagFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setTagFilter(''); setPage(1) }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkCategoryOpen(true)}
              >
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                Категория
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Удалить
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk category dialog */}
      <Dialog open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Сменить категорию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Для {selectedIds.size} транзакций будет установлена:
            </p>
            <div className="space-y-1.5">
              <Label>Категория</Label>
              <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!bulkCategoryId}
              onClick={handleBulkCategory}
            >
              Применить
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Mobile list — iOS Apple Wallet style */}
      <div className="md:hidden space-y-1 bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <span className="text-3xl">💸</span>
            <p className="font-semibold text-foreground">Нет транзакций</p>
            <p className="text-sm text-center px-4">Добавьте первую транзакцию чтобы начать отслеживать финансы</p>
          </div>
        ) : (
          transactions.map((tx, i) => {
            const type = tx.type as TxType
            const amount = Number(tx.amount)
            const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
            return (
              <div key={tx.id}>
                <div
                  className="flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors"
                  onClick={() => setEditingId(tx.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      type === 'INCOME' ? 'bg-green-50' : type === 'EXPENSE' ? 'bg-red-50' : 'bg-blue-50'
                    }`}>
                      {typeIcons[type]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {tx.description || tx.counterparty || typeLabels[type]}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {tx.category?.name ?? 'Без категории'} · {dateLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold tabular-nums ${
                      type === 'INCOME' ? 'text-green-600' : type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'
                    }`}>
                      {type === 'INCOME' ? '+' : '-'}{formatAmount(amount, tx.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">{tx.account.name}</p>
                  </div>
                </div>
                {i < transactions.length - 1 && <div className="mx-4 h-px bg-gray-50" />}
              </div>
            )
          })
        )}
      </div>

      {/* Desktop table */}
      {/* Desktop table — hidden on mobile */}
      <div className="hidden md:block"><Card className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 w-[44px]">
                  <Checkbox
                    checked={transactions.length > 0 && selectedIds.size === transactions.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Выбрать все"
                  />
                </TableHead>
                <TableHead className="w-[110px]">Дата</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="hidden md:table-cell">Категория</TableHead>
                <TableHead>Счёт</TableHead>
                <TableHead className="hidden md:table-cell">Тип</TableHead>
                <TableHead className="hidden lg:table-cell">Теги</TableHead>
                <TableHead className="text-right pr-6">Сумма</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell className="pr-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {!search && typeFilter === 'all' && categoryFilter === 'all' && !tagFilter
                      ? <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl">💸</span>
                          <p className="font-medium text-foreground">Нет транзакций</p>
                          <p className="text-sm">Добавьте первую транзакцию чтобы начать отслеживать финансы</p>
                        </div>
                      : 'Транзакции не найдены'}
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
                    <TableRow
                      key={tx.id}
                      className={`hover:bg-muted/50 ${selectedIds.has(tx.id) ? 'bg-primary/5' : ''}`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedIds.has(tx.id)}
                          onCheckedChange={() => toggleSelect(tx.id)}
                          aria-label="Выбрать"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{dateLabel}</TableCell>
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
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {tx.category?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.account.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeVariants[type]}`}>
                          {typeLabels[type]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {tx.tags?.map(({ tag }) => (
                            <button
                              key={tag.name}
                              type="button"
                              onClick={() => { setTagFilter(tag.name); setPage(1) }}
                              style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, color: tag.color ?? '#2563EB', borderColor: tag.color ? `${tag.color}40` : undefined }}
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80"
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
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
                            <DropdownMenuItem onClick={() => setEditingId(tx.id)}>Редактировать</DropdownMenuItem>
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

      </div>{/* end desktop table */}

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

export default function TransactionsPageWrapper() {
  return (
    <Suspense>
      <TransactionsPage />
    </Suspense>
  )
}
