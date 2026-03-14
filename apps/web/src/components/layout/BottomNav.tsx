'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ArrowLeftRight,
  BarChart3,
  User,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/transactions', icon: ArrowLeftRight, label: 'Записи' },
  // FAB placeholder
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Обзор' },
  { href: '/dashboard/profile', icon: User, label: 'Профиль' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {/* First 2 tabs */}
          {tabs.slice(0, 2).map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] active:scale-95 transition-transform"
              >
                <tab.icon
                  className={`h-6 w-6 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                  strokeWidth={active ? 2.5 : 1.5}
                  fill={active ? 'currentColor' : 'none'}
                />
                {active && (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                )}
                {!active && (
                  <span className="text-[10px] font-medium text-muted-foreground">{tab.label}</span>
                )}
              </Link>
            )
          })}

          {/* Center FAB */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg active:scale-95 transition-transform -mt-5"
            style={{ background: 'var(--gradient-primary)' }}
            aria-label="Добавить транзакцию"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>

          {/* Last 2 tabs */}
          {tabs.slice(2).map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] active:scale-95 transition-transform"
              >
                <tab.icon
                  className={`h-6 w-6 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                  strokeWidth={active ? 2.5 : 1.5}
                  fill={active ? 'currentColor' : 'none'}
                />
                {active && (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                )}
                {!active && (
                  <span className="text-[10px] font-medium text-muted-foreground">{tab.label}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  )
}
