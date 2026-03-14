'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { groupTransactionsByDate } from '@/lib/group-by-date'
import { TransactionRow, type TransactionRowData } from './TransactionRow'
import { SwipeableTransaction } from './SwipeableTransaction'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { TransactionForm } from './transaction-form'
import { toast } from 'sonner'

interface TransactionFeedProps {
  variant?: 'compact' | 'full'
  filters?: {
    accountId?: string
    walletId?: string
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    categoryId?: string
    dateFrom?: Date
    dateTo?: Date
    search?: string
    tags?: string[]
  }
  limit?: number
  showDateHeaders?: boolean
  showColumnHeaders?: boolean
}

export function TransactionFeed({
  variant: variantProp,
  filters = {},
  limit = 20,
  showDateHeaders = true,
  showColumnHeaders = false,
}: TransactionFeedProps) {
  const isMobile = useIsMobile()
  const variant = variantProp ?? (isMobile ? 'compact' : 'full')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: categories } = trpc.category.list.useQuery()

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.transaction.infiniteList.useInfiniteQuery(
    { limit, ...filters },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  )

  const deleteMutation = trpc.transaction.delete.useMutation({
    onSuccess: () => {
      toast.success('Транзакция удалена')
      void utils.transaction.infiniteList.invalidate()
      void utils.transaction.list.invalidate()
    },
    onError: (e) => toast.error(`Ошибка: ${e.message}`),
  })

  const updateCategory = trpc.transaction.updateCategory.useMutation({
    onSuccess: () => {
      void utils.transaction.infiniteList.invalidate()
      void utils.transaction.list.invalidate()
    },
    onError: (e) => toast.error('Ошибка: ' + e.message),
  })

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleRefresh = useCallback(async () => {
    await utils.transaction.infiniteList.invalidate()
  }, [utils])

  const handleCategoryChanged = useCallback(
    (txId: string, categoryId: string | null) => {
      updateCategory.mutate({ id: txId, categoryId })
    },
    [updateCategory],
  )

  const allItems = data?.pages.flatMap((p) => p.items) ?? []
  const groups = showDateHeaders ? groupTransactionsByDate(allItems) : null

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-1 glass-card card-default rounded-2xl p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (allItems.length === 0) {
    return (
      <div className="glass-card card-default rounded-2xl flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <span className="text-3xl">💸</span>
        <p className="font-semibold text-foreground">Нет транзакций</p>
        <p className="text-sm text-center px-4">
          Добавьте первую транзакцию чтобы начать отслеживать финансы
        </p>
      </div>
    )
  }

  const renderRow = (tx: TransactionRowData) => {
    const row = (
      <TransactionRow
        key={tx.id}
        transaction={tx}
        variant={variant}
        onEdit={() => setEditingId(tx.id)}
        categories={categories ?? []}
        onCategoryChanged={handleCategoryChanged}
      />
    )

    if (isMobile) {
      return (
        <SwipeableTransaction
          key={tx.id}
          onEdit={() => setEditingId(tx.id)}
          onDelete={() => {
            toast('Удалить транзакцию?', {
              action: {
                label: 'Удалить',
                onClick: () => deleteMutation.mutate({ id: tx.id }),
              },
            })
          }}
        >
          {row}
        </SwipeableTransaction>
      )
    }

    return row
  }

  const feedContent = (
    <div className="glass-card card-default rounded-2xl overflow-hidden">
      {/* Column headers for full variant */}
      {showColumnHeaders && variant === 'full' && (
        <div className="flex items-center gap-4 px-5 py-2 border-b border-border/50 text-xs font-medium text-muted-foreground">
          <div className="w-8 shrink-0" />
          <div className="flex-1">Описание</div>
          <div className="w-[140px] shrink-0 hidden md:block">Категория</div>
          <div className="w-[100px] shrink-0 hidden lg:block">Счёт</div>
          <div className="w-[80px] shrink-0 hidden md:block">Тип</div>
          <div className="w-[120px] shrink-0 hidden lg:block">Теги</div>
          <div className="w-[110px] shrink-0 text-right">Сумма</div>
          <div className="w-[80px] shrink-0 text-right hidden md:block">Дата</div>
        </div>
      )}

      {groups
        ? groups.map((group) => (
            <div key={group.label}>
              {/* Sticky date header */}
              <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm px-4 py-1.5 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map((tx) => renderRow(tx as TransactionRowData))}
            </div>
          ))
        : allItems.map((tx) => renderRow(tx as TransactionRowData))}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading more spinner */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )

  // Edit modal
  const editingTx = allItems.find((t) => t.id === editingId)

  return (
    <>
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>{feedContent}</PullToRefresh>
      ) : (
        feedContent
      )}

      {editingTx && (
        <TransactionForm
          initialData={{
            id: editingTx.id,
            type: editingTx.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
            accountId: editingTx.accountId,
            amount: editingTx.amount,
            date: editingTx.date,
            description: editingTx.description,
            categoryId: editingTx.categoryId,
          }}
          open={!!editingId}
          onOpenChange={(o) => {
            if (!o) setEditingId(null)
          }}
        />
      )}
    </>
  )
}
