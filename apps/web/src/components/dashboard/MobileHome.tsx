'use client'

import Link from 'next/link'
import { ArrowLeftRight, Sparkles, Upload, Target, Flag } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { RecentTransactionsWidget } from './RecentTransactionsWidget'
import type { ReactNode } from 'react'

interface MobileHomeProps {
  stats: { totalBalance: number; monthIncome: number; monthExpense: number; monthNet: number } | undefined
  wallet: { currency: string; accounts: { id: string }[] } | undefined
  isLoading: boolean
  greeting: { message: string; status: string } | undefined
  greetingLoading: boolean
  // Slots for feed
  transactionsSlot: ReactNode
  budgetsSlot: ReactNode
  goalsSlot: ReactNode
  insightsSlot: ReactNode
  // Gamification
  gamificationData?: { streak?: number } | undefined
  scoreData?: { score?: number } | undefined
}

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

const quickActions = [
  { label: 'Перевод', href: '/dashboard/transactions', icon: ArrowLeftRight, color: '#007AFF' },
  { label: 'AI', href: '/dashboard/ai-chat', icon: Sparkles, color: '#AF52DE' },
  { label: 'Импорт', href: '/dashboard/import', icon: Upload, color: '#636366' },
  { label: 'Бюджеты', href: '/dashboard/budgets', icon: Target, color: '#FF9500' },
  { label: 'Цели', href: '/dashboard/goals', icon: Flag, color: '#5856D6' },
]

export function MobileHome({
  stats,
  wallet,
  isLoading,
  greeting,
  greetingLoading,
  transactionsSlot,
  budgetsSlot,
  goalsSlot,
  insightsSlot,
  gamificationData,
  scoreData,
}: MobileHomeProps) {
  const scoreDot = scoreData?.score
  const streak = gamificationData?.streak

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Zone 1: Balance Hero */}
      <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'var(--gradient-primary)' }}>
        {/* Greeting */}
        {greetingLoading ? (
          <div className="h-5 w-40 animate-pulse bg-white/20 rounded-lg mb-3" />
        ) : greeting ? (
          <p className="text-sm font-medium text-white/80 mb-1 truncate">{greeting.message}</p>
        ) : null}

        {/* Balance */}
        {isLoading ? (
          <div className="h-10 w-40 animate-pulse bg-white/20 rounded-xl mb-3" />
        ) : (
          <p className="text-[36px] font-bold tracking-tight leading-none mb-3">
            <AnimatedNumber value={stats?.totalBalance ?? 0} currency={wallet?.currency} className="text-white" />
          </p>
        )}

        {/* Income / Expense summary */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <p className="text-white/60 text-xs">Доходы</p>
            <p className="font-semibold">+{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Расходы</p>
            <p className="font-semibold">-{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}</p>
          </div>
          {/* Score dot + streak badge */}
          <div className="ml-auto flex items-center gap-2">
            {scoreDot != null && (
              <div className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full ${scoreDot >= 70 ? 'bg-green-400' : scoreDot >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className="text-xs text-white/70">{scoreDot}</span>
              </div>
            )}
            {streak != null && streak > 0 && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-medium">
                🔥 {streak}д
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Zone 2: Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 shrink-0 rounded-full bg-card px-4 py-2.5 shadow-sm active:scale-95 transition-transform"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: action.color }}
            >
              <action.icon className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Zone 3: Activity Feed */}
      <div className="space-y-4">
        {transactionsSlot}
        {budgetsSlot}
        {goalsSlot}
        {insightsSlot}
      </div>
    </div>
  )
}
