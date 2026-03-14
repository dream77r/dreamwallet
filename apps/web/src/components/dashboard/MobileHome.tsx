'use client'

import Link from 'next/link'
import { ArrowLeftRight, Sparkles, Upload, Target, Flag } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { GradientHero } from '@/components/ui/gradient-hero'
import { ActionRow, ActionButton } from '@/components/ui/action-row'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'
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
  { label: 'Перевод', href: '/dashboard/transactions', icon: ArrowLeftRight, color: '#667eea' },
  { label: 'AI', href: '/dashboard/ai-chat', icon: Sparkles, color: '#764ba2' },
  { label: 'Импорт', href: '/dashboard/import', icon: Upload, color: '#667eea' },
  { label: 'Бюджеты', href: '/dashboard/budgets', icon: Target, color: '#667eea' },
  { label: 'Цели', href: '/dashboard/goals', icon: Flag, color: '#667eea' },
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
      <GradientHero variant="default">
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
            <p className="font-semibold text-income">+{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Расходы</p>
            <p className="font-semibold text-expense">-{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}</p>
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
      </GradientHero>

      {/* Zone 2: Quick Actions */}
      <ActionRow>
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <ActionButton
              icon={<action.icon className="h-3.5 w-3.5" strokeWidth={2} />}
              label={action.label}
              variant={action.label === 'AI' ? 'gradient' : 'primary'}
              onClick={() => {}}
            />
          </Link>
        ))}
      </ActionRow>

      {/* Zone 3: Activity Feed */}
      <StaggerList className="space-y-4">
        <StaggerItem>{transactionsSlot}</StaggerItem>
        <StaggerItem>{budgetsSlot}</StaggerItem>
        <StaggerItem>{goalsSlot}</StaggerItem>
        <StaggerItem>{insightsSlot}</StaggerItem>
      </StaggerList>
    </div>
  )
}
