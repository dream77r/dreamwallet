'use client'

import { useState } from 'react'
import { Check, ChevronDown, Tag } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
}

type Transaction = {
  id: string
  type: string
  category?: { id: string; name: string; icon?: string | null; color?: string | null } | null
  description?: string | null
  counterparty?: string | null
}

interface Props {
  tx: Transaction
  categories: Category[]
  onChanged: (txId: string, categoryId: string | null, categoryName: string | null, tx: Transaction) => void
}

export function InlineCategoryPicker({ tx, categories, onChanged }: Props) {
  const [open, setOpen] = useState(false)

  const filtered = categories.filter(c => c.type === tx.type)
  const current = tx.category

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => { e.stopPropagation(); setOpen(true) }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
            'hover:ring-2 hover:ring-primary/30 cursor-pointer',
            current
              ? 'bg-primary/8 text-primary'
              : 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/40'
          )}
          style={current?.color ? { backgroundColor: `${current.color}18`, color: current.color } : undefined}
        >
          {current ? (
            <>
              {current.icon && <span className="text-[11px]">{current.icon}</span>}
              <span>{current.name}</span>
            </>
          ) : (
            <>
              <Tag className="h-3 w-3" />
              <span>Без категории</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start" onClick={e => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Поиск категории..." className="h-8 text-sm" />
          <CommandList>
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {filtered.map(cat => (
                <CommandItem
                  key={cat.id}
                  value={cat.name}
                  onSelect={() => {
                    setOpen(false)
                    onChanged(tx.id, cat.id, cat.name, tx)
                  }}
                  className="gap-2 text-sm cursor-pointer"
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                    style={{ backgroundColor: cat.color ? `${cat.color}25` : '#f3f4f6' }}
                  >
                    {cat.icon ?? '📦'}
                  </div>
                  <span className="flex-1">{cat.name}</span>
                  {current?.id === cat.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
              {current && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    setOpen(false)
                    onChanged(tx.id, null, null, tx)
                  }}
                  className="gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                    <Tag className="h-3 w-3" />
                  </div>
                  Убрать категорию
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
