'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Plus } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatAmount } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-mobile'

interface Account {
  id: string
  name: string
  type: string
  balance: unknown
  currency: string
  icon: string | null
}

interface BalanceHeroProps {
  totalBalance: number
  accounts: Account[]
  currency?: string
  isLoading: boolean
  onVoiceInput?: () => void
  onQuickAdd?: () => void
}

export function BalanceHero({ totalBalance, accounts, currency = 'RUB', isLoading, onVoiceInput, onQuickAdd }: BalanceHeroProps) {
  const isMobile = useIsMobile()
  const [activeIndex, setActiveIndex] = useState(0)

  const cards = [
    { id: 'total', name: 'Все счета', balance: totalBalance, currency },
    ...accounts.map((a) => ({
      id: a.id,
      name: a.name,
      balance: Number(a.balance),
      currency: a.currency,
    })),
  ]

  if (isLoading) {
    return (
      <div className="gradient-hero rounded-2xl p-5 text-white">
        <Skeleton className="h-4 w-24 bg-white/20 mb-3" />
        <Skeleton className="h-10 w-44 bg-white/20 mb-3" />
        <Skeleton className="h-6 w-32 bg-white/20" />
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="relative">
        <div className="overflow-hidden rounded-2xl">
          <motion.div
            className="flex"
            drag="x"
            dragConstraints={{ left: -(cards.length - 1) * 280, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              const threshold = 100
              if (info.offset.x < -threshold && activeIndex < cards.length - 1) {
                setActiveIndex((i) => i + 1)
              } else if (info.offset.x > threshold && activeIndex > 0) {
                setActiveIndex((i) => i - 1)
              }
            }}
            animate={{ x: -activeIndex * 100 + '%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ width: `${cards.length * 100}%` }}
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className="gradient-hero rounded-2xl p-5 text-white relative overflow-hidden"
                style={{ width: `${100 / cards.length}%` }}
              >
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.06]" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-white/[0.04]" />
                <div className="relative z-10">
                  <p className="text-sm font-medium opacity-75 mb-1">{card.name}</p>
                  <p className="text-[32px] font-bold tracking-tight leading-none mb-2">
                    <AnimatedNumber value={card.balance} currency={card.currency} className="text-white" />
                  </p>
                  {/* Action buttons on first card only */}
                  {card.id === 'total' && (
                    <div className="flex items-center gap-2">
                      {onQuickAdd && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
                          className="flex items-center gap-1.5 bg-white/[0.15] hover:bg-white/[0.25] rounded-lg px-3 py-1.5 transition-colors active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Добавить</span>
                        </button>
                      )}
                      {onVoiceInput && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onVoiceInput() }}
                          className="flex items-center gap-1.5 bg-white/[0.15] hover:bg-white/[0.25] rounded-lg px-3 py-1.5 transition-colors active:scale-95"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Голос</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
        {/* Dot indicators */}
        {cards.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {cards.map((_, i) => (
              <button
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30'
                }`}
                onClick={() => setActiveIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Desktop: horizontal row of cards
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="gradient-hero rounded-2xl p-4 text-white relative overflow-hidden group hover:shadow-lg transition-shadow"
        >
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-white/[0.06]" />
          <p className="text-xs font-medium opacity-75 mb-1">{card.name}</p>
          <p className="text-xl font-bold tracking-tight">
            {formatAmount(card.balance, card.currency)}
          </p>
        </div>
      ))}
    </div>
  )
}
