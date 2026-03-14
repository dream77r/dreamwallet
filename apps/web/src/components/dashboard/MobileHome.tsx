'use client'

import Link from 'next/link'
import { ArrowLeftRight, Sparkles, Upload, Target, Flag, TrendingUp, TrendingDown } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { StaggerList, StaggerItem } from '@/components/ui/stagger-list'
import type { ReactNode } from 'react'

interface MobileHomeProps {
  stats: { totalBalance: number; monthIncome: number; monthExpense: number; monthNet: number } | undefined
  wallet: { currency: string; accounts: { id: string }[] } | undefined
  isLoading: boolean
  greeting: { message: string; status: string } | undefined
  greetingLoading: boolean
  transactionsSlot: ReactNode
  budgetsSlot: ReactNode
  goalsSlot: ReactNode
  insightsSlot: ReactNode
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
  { label: 'Перевод', href: '/dashboard/transactions', icon: ArrowLeftRight, gradient: false },
  { label: 'AI', href: '/dashboard/ai-chat', icon: Sparkles, gradient: true },
  { label: 'Импорт', href: '/dashboard/import', icon: Upload, gradient: false },
  { label: 'Бюджеты', href: '/dashboard/budgets', icon: Target, gradient: false },
  { label: 'Цели', href: '/dashboard/goals', icon: Flag, gradient: false },
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
    <div className="space-y-5 animate-fade-up">
      {/* ─── Hero Card ─── */}
      <div className="gradient-hero rounded-2xl p-5 text-white relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-white/[0.04]" />

        <div className="relative z-10">
          {/* Greeting */}
          {greetingLoading ? (
            <div className="h-4 w-48 animate-pulse bg-white/20 rounded-lg mb-3" />
          ) : greeting ? (
            <p className="text-sm font-medium opacity-75 mb-2 line-clamp-1">{greeting.message}</p>
          ) : null}

          {/* Balance — main number */}
          {isLoading ? (
            <div className="h-10 w-44 animate-pulse bg-white/20 rounded-xl mb-4" />
          ) : (
            <p className="text-[36px] font-bold tracking-tight leading-none mb-4">
              <AnimatedNumber value={stats?.totalBalance ?? 0} currency={wallet?.currency} className="text-white" />
            </p>
          )}

          {/* Income / Expense pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/[0.12] rounded-lg px-2.5 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 opacity-70" />
              {isLoading ? <div className="h-4 w-14 bg-white/15 rounded animate-pulse" /> : (
                <span className="text-xs font-bold">+{formatAmount(stats?.monthIncome ?? 0, wallet?.currency)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.12] rounded-lg px-2.5 py-1.5">
              <TrendingDown className="h-3.5 w-3.5 opacity-70" />
              {isLoading ? <div className="h-4 w-14 bg-white/15 rounded animate-pulse" /> : (
                <span className="text-xs font-bold">-{formatAmount(stats?.monthExpense ?? 0, wallet?.currency)}</span>
              )}
            </div>

            {/* Score + Streak */}
            <div className="ml-auto flex items-center gap-1.5">
              {scoreDot != null && (
                <div className="flex items-center gap-1 bg-white/[0.12] rounded-lg px-2 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${scoreDot >= 70 ? 'bg-green-400' : scoreDot >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                  <span className="text-[11px] font-bold">{scoreDot}</span>
                </div>
              )}
              {streak != null && streak > 0 && (
                <div className="bg-white/[0.12] rounded-lg px-2 py-1.5">
                  <span className="text-[11px] font-bold">🔥{streak}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick Actions — horizontal scroll ─── */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-1.5 snap-start shrink-0 active:scale-95 transition-transform"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              action.gradient
                ? 'gradient-hero text-white shadow-sm'
                : 'bg-primary/10 text-primary'
            }`}>
              <action.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* ─── Activity Feed ─── */}
      <StaggerList className="space-y-4">
        <StaggerItem>{transactionsSlot}</StaggerItem>
        <StaggerItem>{budgetsSlot}</StaggerItem>
        <StaggerItem>{goalsSlot}</StaggerItem>
        <StaggerItem>{insightsSlot}</StaggerItem>
      </StaggerList>
    </div>
  )
}
