'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, Wallet, CalendarClock } from 'lucide-react'

const tabs = [
  { href: '/tg',              icon: Home,          label: 'Главная' },
  { href: '/tg/add',          icon: PlusCircle,    label: 'Добавить' },
  { href: '/tg/budgets',      icon: Wallet,        label: 'Бюджеты' },
  { href: '/tg/subscriptions', icon: CalendarClock, label: 'Подписки' },
] as const

export function BottomTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur-lg safe-area-pb">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
