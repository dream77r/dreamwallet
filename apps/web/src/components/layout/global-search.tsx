'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)

  const { data: results, isLoading } = trpc.transaction.search.useQuery(
    { query: debouncedQuery, limit: 10 },
    { enabled: debouncedQuery.length >= 2 }
  )

  // Cmd+K / Ctrl+K hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const handleSelect = useCallback(() => {
    router.push('/dashboard/transactions')
    handleClose()
  }, [router, handleClose])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 text-muted-foreground text-sm px-3"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Поиск</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
          {/* Input */}
          <div className="flex items-center border-b px-4 py-3 gap-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Поиск транзакций..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto">
            {debouncedQuery.length < 2 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Введите минимум 2 символа для поиска
              </div>
            ) : isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Ищем...
              </div>
            ) : !results || results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Ничего не найдено по запросу «{debouncedQuery}»
              </div>
            ) : (
              <div className="divide-y">
                {results.map((tx) => (
                  <button
                    key={tx.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                    onClick={handleSelect}
                  >
                    {/* Icon */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${tx.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {tx.category?.icon ?? (tx.type === 'INCOME' ? '↑' : '↓')}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description ?? tx.counterparty ?? 'Без описания'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {tx.account.name}
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

                    {/* Amount */}
                    <div className="flex items-center gap-1 shrink-0">
                      {tx.type === 'INCOME'
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      }
                      <span className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatAmount(Number(tx.amount), tx.account.currency)}
                      </span>
                    </div>
                  </button>
                ))}

                {/* Go to transactions */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={handleSelect}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Открыть все транзакции
                </button>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t px-4 py-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>↵ выбрать</span>
            <span>Esc закрыть</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
