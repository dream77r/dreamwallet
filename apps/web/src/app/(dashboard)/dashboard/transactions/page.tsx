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
  Sparkles,
  Wand2,
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
import { InlineCategoryPicker } from '@/components/transactions/InlineCategoryPicker'
import { SuggestRuleDialog, type SuggestRulePayload } from '@/components/transactions/SuggestRuleDialog'

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

function getDisplayDescription(description: string | null, counterparty: string | null, fallback: string): string {
  const isBankGarbage = (s: string) => 
    s.includes('Операция по карте') || s.includes('место совершения операции') || s.includes('дата создания транзакции')
  
  if (description && !isBankGarbage(description)) {
    return description.slice(0, 50) + (description.length > 50 ? '...' : '')
  }
  if (counterparty && counterparty.length > 0) return counterparty.slice(0, 50)
  if (description && isBankGarbage(description)) {
    // Try to extract merchant from garbage
    const match = description.match(/место совершения операции:\s*(?:[A-Z]{2}\/[^/]+\/)?([^,]+)/i)
    if (match) return match[1].trim().slice(0, 50)
  }
  return fallback
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
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false)
  const [isKeywordCategorizing, setIsKeywordCategorizing] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [suggestRule, setSuggestRule] = useState<SuggestRulePayload | null>(null)

  const updateCategory = trpc.transaction.updateCategory.useMutation({
    onSuccess: () => utils.transaction.list.invalidate(),
    onError: (e) => toast.error('Ошибка: ' + e.message),
  })

  function handleCategoryChanged(
    txId: string,
    categoryId: string | null,
    categoryName: string | null,
    tx: { description?: string | null; counterparty?: string | null; category?: { icon?: string | null } | null }
  ) {
    updateCategory.mutate({ id: txId, categoryId })
    // Предлагаем правило только если назначили категорию (не убрали)
    if (categoryId && categoryName) {
      setSuggestRule({
        txId,
        description: tx.description ?? null,
        counterparty: tx.counterparty ?? null,
        categoryId,
        categoryName,
        categoryIcon: tx.category?.icon ?? null,
      })
    }
  }
  const cleanDescriptions = trpc.transaction.cleanDescriptions.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.transaction.list.invalidate() },
    onError: (e) => toast.error('Ошибка: ' + e.message),
    onSettled: () => setIsCleaning(false),
  })
  const autoCategorize = trpc.transaction.autoCategorize.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.transaction.list.invalidate()
    },
    onError: (e) => toast.error('Ошибка: ' + e.message),
    onSettled: () => { setIsAutoCategorizing(false); setIsKeywordCategorizing(false) },
  })
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
      <SuggestRuleDialog
        payload={suggestRule}
        onClose={() => setSuggestRule(null)}
        onApplied={() => { setSuggestRule(null); utils.transaction.list.invalidate() }}
      />
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
          {/* Categorization buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsKeywordCategorizing(true); autoCategorize.mutate({ useAI: false }) }}
            disabled={isKeywordCategorizing || isAutoCategorizing}
            title="Категоризировать по ключевым словам"
          >
            <Tag className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{isKeywordCategorizing ? 'Обрабатываю...' : 'Категории'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsAutoCategorizing(true); autoCategorize.mutate({ useAI: true }) }}
            disabled={isAutoCategorizing || isKeywordCategorizing}
            title="AI категоризация"
            className="text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:border-indigo-300"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{isAutoCategorizing ? 'AI...' : 'AI'}</span>
          </Button>
          {/* Secondary actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={handleExport} disabled={exportQuery.isFetching}>
                <Download className="h-4 w-4 mr-2" />
                {exportQuery.isFetching ? 'Экспорт...' : 'Экспорт CSV'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setIsCleaning(true); cleanDescriptions.mutate() }}
                disabled={isCleaning}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isCleaning ? 'Чищу...' : 'Очистить описания'}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="cursor-pointer w-full flex items-center">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanReceipt} />
                  <Camera className="h-4 w-4 mr-2" />
                  {parseReceiptMutation.isPending ? 'Сканирую...' : 'Сканировать чек'}
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TransactionForm />
        </div>
      </div>

      {/* Summary row — compact single card */}
      <div className="flex gap-2">
        <div className="flex-1 bg-card rounded-2xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Доходы</p>
          {isLoading ? <Skeleton className="h-5 w-16 mt-1" /> : (
            <p className="text-sm font-bold tabular-nums text-green-500">+{formatAmount(totalIncome)}</p>
          )}
        </div>
        <div className="flex-1 bg-card rounded-2xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Расходы</p>
          {isLoading ? <Skeleton className="h-5 w-16 mt-1" /> : (
            <p className="text-sm font-bold tabular-nums text-red-500">-{formatAmount(totalExpense)}</p>
          )}
        </div>
        <div className="flex-1 bg-card rounded-2xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Итого</p>
          {isLoading ? <Skeleton className="h-5 w-16 mt-1" /> : (
            <p className={`text-sm font-bold tabular-nums ${net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {net >= 0 ? '+' : ''}{formatAmount(net)}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card rounded-2xl shadow-sm border-0 dark:shadow-none">
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
      <div className="md:hidden space-y-1 bg-card rounded-2xl shadow-sm overflow-hidden dark:shadow-none">
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
                  className="flex items-center justify-between px-4 py-3 active:bg-muted transition-colors"
                  onClick={() => setEditingId(tx.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      type === 'INCOME' ? 'bg-green-500/15' : type === 'EXPENSE' ? 'bg-red-500/15' : 'bg-blue-500/15'
                    }`}>
                      {typeIcons[type]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {getDisplayDescription(tx.description ?? null, tx.counterparty ?? null, typeLabels[type] ?? "")}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <InlineCategoryPicker
                          tx={tx}
                          categories={categories ?? []}
                          onChanged={handleCategoryChanged}
                        />
                        <span className="text-xs text-muted-foreground">· {dateLabel}</span>
                      </div>
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
      <div className="hidden md:block"><Card className="bg-card rounded-2xl shadow-sm border-0 dark:shadow-none overflow-hidden">
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
                            {getDisplayDescription(tx.description ?? null, tx.counterparty ?? null, typeLabels[type] ?? "")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <InlineCategoryPicker
                          tx={tx}
                          categories={categories ?? []}
                          onChanged={handleCategoryChanged}
                        />
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
