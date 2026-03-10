'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from '@/components/ui/sidebar'
import { Bitcoin, FileText } from "lucide-react"
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, PieChart,
  FolderKanban, FolderOpen, Target, Upload, Settings, Wallet,
  LogOut, Sparkles, Shield, Tag, Hash, Repeat2, Zap, Flag,
  TrendingUp, BrainCircuit, HandCoins, CalendarClock, Landmark,
} from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

type NavItem = { title: string; href: string; icon: React.ElementType; color: string }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Главное',
    items: [
      { title: 'Обзор',       href: '/dashboard',                    icon: LayoutDashboard, color: '#007AFF' },
      { title: 'Транзакции',  href: '/dashboard/transactions',        icon: ArrowLeftRight,  color: '#34C759' },
      { title: 'Счета',       href: '/dashboard/accounts',            icon: CreditCard,      color: '#5856D6' },
    ],
  },
  {
    label: 'Учёт',
    items: [
      { title: 'Регулярные',  href: '/dashboard/recurring',           icon: Repeat2,         color: '#FF9500' },
      { title: 'Долги',       href: '/dashboard/debts',               icon: HandCoins,       color: '#FF3B30' },
      { title: 'Подписки',    href: '/dashboard/subscriptions-tracker', icon: CalendarClock, color: '#FF2D55' },
    ],
  },
  {
    label: 'Планирование',
    items: [
      { title: 'Бюджеты',     href: '/dashboard/budgets',             icon: Target,          color: '#FF9500' },
      { title: 'Цели',        href: '/dashboard/goals',               icon: Flag,            color: '#5856D6' },
      { title: 'Авто-правила',href: '/dashboard/auto-rules',          icon: Zap,             color: '#34C759' },
    ],
  },
  {
    label: 'Анализ',
    items: [
      { title: 'Аналитика',   href: '/dashboard/analytics',           icon: PieChart,        color: '#007AFF' },
      { title: 'Прогноз',     href: '/dashboard/forecast',            icon: TrendingUp,      color: '#5AC8FA' },
      { title: 'Активы',      href: '/dashboard/net-worth',           icon: Landmark,        color: '#30D158' },
      { title: 'Крипто',      href: '/dashboard/crypto',              icon: Bitcoin,         color: '#FF9F0A' },
      { title: 'Отчёты',     href: '/dashboard/reports',             icon: FileText,        color: '#30D158' },
    ],
  },
  {
    label: 'Инструменты',
    items: [
      { title: 'AI Советник', href: '/dashboard/ai-chat',             icon: BrainCircuit,    color: '#5856D6' },
      { title: 'Импорт',      href: '/dashboard/import',              icon: Upload,          color: '#636366' },
      { title: 'Категории',   href: '/dashboard/categories',          icon: Tag,             color: '#FF6B35' },
      { title: 'Теги',        href: '/dashboard/tags',                icon: Hash,            color: '#32ADE6' },
    ],
  },
  {
    label: 'Бизнес',
    items: [
      { title: 'Проекты',     href: '/dashboard/projects',            icon: FolderKanban,    color: '#007AFF' },
      { title: 'Пространства',href: '/projects',                      icon: FolderOpen,      color: '#5856D6' },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === 'ADMIN' ||
                  (session?.user as Record<string, unknown> | undefined)?.role === 'SUPER_ADMIN'
  const user = session?.user

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <Sidebar variant="inset" className="border-r border-black/[0.08]">
      {/* Logo */}
      <SidebarHeader className="pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#007AFF] text-white shadow-sm">
                  <Wallet className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-base tracking-tight">DreamWallet</span>
                  <span className="text-[11px] text-[#8E8E93] font-medium">Управление финансами</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation groups */}
      <SidebarContent className="px-2 gap-0">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] px-2 mb-1 h-auto py-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`rounded-xl px-2 py-2 h-auto transition-all duration-150 ${
                          isActive
                            ? 'bg-white shadow-sm text-[#007AFF] font-medium'
                            : 'hover:bg-black/[0.04] text-[#3C3C43]'
                        }`}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-white"
                            style={{ backgroundColor: item.color }}
                          >
                            <item.icon className="h-4 w-4" strokeWidth={2} />
                          </div>
                          <span className="text-[14px] font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-black/[0.08] pt-2 px-2">
        <SidebarMenu className="gap-0.5">
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-black/[0.04]">
                <Link href="/admin" className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#FF3B30] text-white">
                    <Shield className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-medium text-[#3C3C43]">Админка</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-black/[0.04]">
              <Link href="/dashboard/settings" className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#636366] text-white">
                  <Settings className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium text-[#3C3C43]">Настройки</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-black/[0.04]">
              <Link href="/dashboard/pricing" className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium text-[#3C3C43]">Тарифы</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* User info + sign out */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="rounded-xl px-2 py-2 h-auto hover:bg-red-50 text-[#8E8E93] hover:text-red-600 transition-colors"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#E5E5EA]">
                  <LogOut className="h-4 w-4 text-[#636366]" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium truncate">{user?.name ?? 'Выйти'}</span>
                  {user?.email && <span className="text-[11px] text-[#8E8E93] truncate">{user.email}</span>}
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
