'use client'

import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react'
import { formatAmount, getDisplayDescription } from '@/lib/format'
import { InlineCategoryPicker } from './InlineCategoryPicker'

type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

const typeLabels: Record<TxType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
  TRANSFER: 'Перевод',
}

const typeIcons: Record<TxType, React.ReactNode> = {
  INCOME: <ArrowUpRight className="h-3.5 w-3.5 text-income" />,
  EXPENSE: <ArrowDownRight className="h-3.5 w-3.5 text-expense" />,
  TRANSFER: <ArrowLeftRight className="h-3.5 w-3.5 text-transfer" />,
}

const typeBadgeVariants: Record<TxType, string> = {
  INCOME: 'bg-income/10 text-income',
  EXPENSE: 'bg-expense/10 text-expense',
  TRANSFER: 'bg-transfer/10 text-transfer',
}

export interface TransactionRowData {
  id: string
  type: string
  amount: unknown
  currency: string
  description: string | null
  counterparty: string | null
  date: Date | string
  categoryId: string | null
  category: { id: string; name: string; icon: string | null; type: string; color: string | null } | null
  account: { id: string; name: string; type: string; icon: string | null }
  tags: Array<{ tag: { name: string; color: string | null } }>
}

interface TransactionRowProps {
  transaction: TransactionRowData
  variant?: 'compact' | 'full'
  onEdit?: () => void
  onDelete?: () => void
  categories?: Array<{ id: string; name: string; icon: string | null; type: string; color: string | null }>
  onCategoryChanged?: (
    txId: string,
    categoryId: string | null,
    categoryName: string | null,
    tx: TransactionRowData,
  ) => void
}

export function TransactionRow({
  transaction: tx,
  variant = 'compact',
  onEdit,
  categories,
  onCategoryChanged,
}: TransactionRowProps) {
  const type = tx.type as TxType
  const amount = Number(tx.amount)
  const dateLabel = new Date(tx.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })

  if (variant === 'compact') {
    return (
      <div
        className="flex items-center justify-between px-4 py-3 active:bg-muted/50 transition-colors tap-target cursor-pointer"
        onClick={onEdit}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              type === 'INCOME'
                ? 'bg-income/15'
                : type === 'EXPENSE'
                  ? 'bg-expense/15'
                  : 'bg-transfer/15'
            }`}
          >
            {typeIcons[type]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {getDisplayDescription(tx.description, tx.counterparty, typeLabels[type] ?? '')}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {categories && onCategoryChanged ? (
                <InlineCategoryPicker
                  tx={tx}
                  categories={categories}
                  onChanged={(txId, catId, catName) =>
                    onCategoryChanged(txId, catId, catName, tx)
                  }
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {tx.category?.name ?? 'Без категории'}
                </span>
              )}
              <span className="text-xs text-muted-foreground">&middot; {dateLabel}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p
            className={`text-sm font-bold tabular-nums ${
              type === 'INCOME'
                ? 'text-income'
                : type === 'TRANSFER'
                  ? 'text-transfer'
                  : 'text-expense'
            }`}
          >
            {type === 'INCOME' ? '+' : '-'}
            {formatAmount(amount, tx.currency)}
          </p>
          <p className="text-[11px] text-muted-foreground">{tx.account.name}</p>
        </div>
      </div>
    )
  }

  // Full variant — desktop
  return (
    <div
      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
      onClick={onEdit}
    >
      {/* Icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          type === 'INCOME'
            ? 'bg-income/10'
            : type === 'EXPENSE'
              ? 'bg-expense/10'
              : 'bg-transfer/10'
        }`}
      >
        {typeIcons[type]}
      </div>

      {/* Description — flex-1 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {getDisplayDescription(tx.description, tx.counterparty, typeLabels[type] ?? '')}
        </p>
      </div>

      {/* Category */}
      <div className="w-[140px] shrink-0 hidden md:block">
        {categories && onCategoryChanged ? (
          <InlineCategoryPicker
            tx={tx}
            categories={categories}
            onChanged={(txId, catId, catName) =>
              onCategoryChanged(txId, catId, catName, tx)
            }
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {tx.category?.name ?? 'Без категории'}
          </span>
        )}
      </div>

      {/* Account */}
      <div className="w-[100px] shrink-0 hidden lg:block">
        <span className="text-sm text-muted-foreground truncate">{tx.account.name}</span>
      </div>

      {/* Type badge */}
      <div className="w-[80px] shrink-0 hidden md:block">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeVariants[type]}`}
        >
          {typeLabels[type]}
        </span>
      </div>

      {/* Tags */}
      <div className="w-[120px] shrink-0 hidden lg:flex flex-wrap gap-1">
        {tx.tags?.slice(0, 2).map(({ tag }) => (
          <span
            key={tag.name}
            className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: tag.color ? `${tag.color}20` : undefined,
              color: tag.color ?? '#2563EB',
              borderColor: tag.color ? `${tag.color}40` : undefined,
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      {/* Amount */}
      <div className="w-[110px] shrink-0 text-right">
        <span
          className={`font-semibold text-sm ${
            type === 'INCOME'
              ? 'text-income'
              : type === 'TRANSFER'
                ? 'text-transfer'
                : 'text-expense'
          }`}
        >
          {type === 'INCOME' ? '+' : '-'}
          {formatAmount(amount, tx.currency)}
        </span>
      </div>

      {/* Date */}
      <div className="w-[80px] shrink-0 text-right hidden md:block">
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
      </div>
    </div>
  )
}
