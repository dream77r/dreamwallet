'use client'
import { Suspense } from 'react'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
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
import { SuggestRuleDialog, type SuggestRulePayload } from '@/components/transactions/SuggestRuleDialog'
import { PageHeader } from '@/components/ui/page-header'
import { TransactionFeed } from '@/components/transactions/TransactionFeed'
import { formatAmount } from '@/lib/format'

type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false)
  const [isKeywordCategorizing, setIsKeywordCategorizing] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [suggestRule, setSuggestRule] = useState<SuggestRulePayload | null>(null)

  const utils = trpc.useUtils()

  const cleanDescriptions = trpc.transaction.cleanDescriptions.useMutation({
    onSuccess: (data) => { toast.success(data.message); utils.transaction.infiniteList.invalidate(); utils.transaction.list.invalidate() },
    onError: (e) => toast.error('Ошибка: ' + e.message),
    onSettled: () => setIsCleaning(false),
  })
  const autoCategorize = trpc.transaction.autoCategorize.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.transaction.infiniteList.invalidate()
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

  // Fetch categories for filter dropdown
  const { data: categories } = trpc.category.list.useQuery()
  // Fetch tags for filter dropdown
  const { data: tags } = trpc.tags.list.useQuery()

  // Build filters for TransactionFeed
  const feedFilters = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(typeFilter !== 'all' ? { type: typeFilter as TxType } : {}),
    ...(categoryFilter !== 'all' ? { categoryId: categoryFilter } : {}),
    ...(tagFilter ? { tags: [tagFilter] } : {}),
  }), [search, typeFilter, categoryFilter, tagFilter])

  const hasFilters = search || typeFilter !== 'all' || categoryFilter !== 'all' || tagFilter

  const headerActions = (
    <>
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
    </>
  )

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <SuggestRuleDialog
        payload={suggestRule}
        onClose={() => setSuggestRule(null)}
        onApplied={() => { setSuggestRule(null); utils.transaction.infiniteList.invalidate(); utils.transaction.list.invalidate() }}
      />

      <PageHeader
        title="Транзакции"
        description="Все операции"
        actions={headerActions}
      />

      {/* Filters */}
      <div className="glass-card card-default rounded-2xl px-5 py-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по описанию или контрагенту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
          <Select value={tagFilter || 'all'} onValueChange={(v) => setTagFilter(v === 'all' ? '' : v)}>
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
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setTagFilter('') }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Сбросить
            </Button>
          )}
        </div>
      </div>

      {/* Transaction Feed — infinite scroll, replaces table + pagination */}
      <TransactionFeed
        filters={feedFilters}
        showDateHeaders
        showColumnHeaders
      />
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
