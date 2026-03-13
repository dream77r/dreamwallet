'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Menu,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'
import { useSidebar } from '@/components/ui/sidebar'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Обзор' },
  { href: '/dashboard/transactions', icon: ArrowLeftRight, label: 'Транзакции' },
  { href: '/dashboard/analytics', icon: PieChart, label: 'Аналитика' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { toggleSidebar } = useSidebar()

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 pb-safe"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {/* Первые 2 вкладки */}
          {tabs.slice(0, 2).map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 active:scale-95 min-w-[56px] ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <tab.icon
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {/* Центральная кнопка + */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95 transition-transform duration-150 -mt-5"
            aria-label="Добавить транзакцию"
          >
            <Plus className="h-7 w-7" strokeWidth={2} />
          </button>

          {/* Аналитика */}
          {tabs.slice(2).map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 active:scale-95 min-w-[56px] ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <tab.icon
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {/* Кнопка "Ещё" — открывает боковое меню со всеми разделами */}
          <button
            onClick={toggleSidebar}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 active:scale-95 min-w-[56px] text-gray-400"
            aria-label="Все разделы"
          >
            <Menu className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Ещё</span>
          </button>
        </div>
      </nav>

      {quickAddOpen && (
        <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      )}
    </>
  )
}
