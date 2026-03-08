'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { trpc } from '@/lib/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)

  const { data: results, isLoading } = trpc.transaction.search.useQuery(
    { query: debouncedQuery, limit: 20 },
    { enabled: debouncedQuery.length >= 2 }
  )

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setQuery('')
  }, [onOpenChange])

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/dashboard/transactions?highlight=${id}`)
      handleClose()
    },
    [router, handleClose]
  )

  const handleViewAll = useCallback(() => {
    const params = debouncedQuery ? `?search=${encodeURIComponent(debouncedQuery)}` : ''
    router.push(`/dashboard/transactions${params}`)
    handleClose()
  }, [router, debouncedQuery, handleClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Поиск транзакций"
      description="Ищите по описанию, контрагенту или категории"
    >
      <CommandInput
        placeholder="Поиск транзакций..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {debouncedQuery.length < 2 ? (
          <CommandEmpty>Введите минимум 2 символа для поиска</CommandEmpty>
        ) : isLoading ? (
          <CommandEmpty>Ищем...</CommandEmpty>
        ) : !results || results.length === 0 ? (
          <CommandEmpty>Ничего не найдено по запросу «{debouncedQuery}»</CommandEmpty>
        ) : (
          <>
            <CommandGroup heading="Транзакции">
              {results.map((tx) => (
                <CommandItem
                  key={tx.id}
                  value={`${tx.id}-${tx.description ?? ''}-${tx.counterparty ?? ''}`}
                  onSelect={() => handleSelect(tx.id)}
                  className="flex items-center gap-3 py-3"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                      tx.type === 'INCOME'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {tx.category?.icon ?? (tx.type === 'INCOME' ? '↑' : '↓')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description ?? tx.counterparty ?? 'Без описания'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{tx.account.name}</span>
                      {tx.category && (
                        <>
                          <span>·</span>
                          <span>{tx.category.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{format(new Date(tx.date), 'd MMM', { locale: ru })}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {tx.type === 'INCOME' ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}
                      {formatAmount(Number(tx.amount), tx.account.currency)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup>
              <CommandItem
                value="__view_all__"
                onSelect={handleViewAll}
                className="justify-center text-muted-foreground"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Показать все результаты
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span>↵ перейти</span>
        <span>↑↓ навигация</span>
        <span>Esc закрыть</span>
      </div>
    </CommandDialog>
  )
}
