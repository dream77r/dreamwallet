'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  TrendingUp, BrainCircuit, HandCoins, CalendarClock, Landmark, Activity,
  Users, Scissors, Trophy, PercentCircle, Receipt, GitBranch,
  BarChart3, Banknote, LineChart, Link2, ChevronDown,
} from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

type NavItem = { title: string; href: string; icon: React.ElementType; color: string }

// 4 groups: Primary (always visible), Finance (collapsible), Insights (collapsed), Tools (collapsed)
const primaryItems: NavItem[] = [
  { title: 'Обзор',       href: '/dashboard',              icon: LayoutDashboard, color: '#007AFF' },
  { title: 'Транзакции',  href: '/dashboard/transactions',  icon: ArrowLeftRight,  color: '#34C759' },
  { title: 'Счета',       href: '/dashboard/accounts',      icon: CreditCard,      color: '#5856D6' },
  { title: 'Аналитика',   href: '/dashboard/analytics',     icon: PieChart,        color: '#007AFF' },
]

const financeItems: NavItem[] = [
  { title: 'Бюджеты',     href: '/dashboard/budgets',             icon: Target,          color: '#FF9500' },
  { title: 'Цели',        href: '/dashboard/goals',               icon: Flag,            color: '#5856D6' },
  { title: 'Регулярные',  href: '/dashboard/recurring',           icon: Repeat2,         color: '#FF9500' },
  { title: 'Долги',       href: '/dashboard/debts',               icon: HandCoins,       color: '#FF3B30' },
  { title: 'Подписки',    href: '/dashboard/subscriptions-tracker', icon: CalendarClock, color: '#FF2D55' },
  { title: 'Кэшбэк',     href: '/dashboard/cashback',            icon: PercentCircle,   color: '#30D158' },
  { title: 'Деление',     href: '/dashboard/splits',              icon: Scissors,        color: '#FF6B35' },
  { title: 'Авто-правила',href: '/dashboard/auto-rules',          icon: Zap,             color: '#34C759' },
]

const insightsItems: NavItem[] = [
  { title: 'Прогноз',     href: '/dashboard/forecast',            icon: TrendingUp,      color: '#5AC8FA' },
  { title: 'Привычки',    href: '/dashboard/habits',              icon: Activity,        color: '#FF2D55' },
  { title: 'Что если',    href: '/dashboard/whatif',              icon: GitBranch,       color: '#AF52DE' },
  { title: 'Активы',      href: '/dashboard/net-worth',           icon: Landmark,        color: '#30D158' },
  { title: 'Инвестиции',  href: '/dashboard/investments',         icon: LineChart,       color: '#007AFF' },
  { title: 'Крипто',      href: '/dashboard/crypto',              icon: Bitcoin,         color: '#FF9F0A' },
  { title: 'Отчёты',     href: '/dashboard/reports',             icon: FileText,        color: '#30D158' },
  { title: 'Санкей',      href: '/dashboard/reports/sankey',      icon: BarChart3,       color: '#5856D6' },
  { title: 'Налоги',      href: '/dashboard/reports/tax',         icon: Receipt,         color: '#64748B' },
  { title: 'Итоги',       href: '/dashboard/wrapped',             icon: Sparkles,        color: '#AF52DE' },
]

const toolsItems: NavItem[] = [
  { title: 'AI Советник', href: '/dashboard/ai-chat',             icon: BrainCircuit,    color: '#5856D6' },
  { title: 'Импорт',      href: '/dashboard/import',              icon: Upload,          color: '#636366' },
  { title: 'Категории',   href: '/dashboard/categories',          icon: Tag,             color: '#FF6B35' },
  { title: 'Теги',        href: '/dashboard/tags',                icon: Hash,            color: '#32ADE6' },
  { title: 'Достижения',  href: '/dashboard/achievements',        icon: Trophy,          color: '#FFD60A' },
  { title: 'Семья',       href: '/dashboard/family',              icon: Users,           color: '#FF2D55' },
  { title: 'Банки',       href: '/dashboard/bank-connections',    icon: Banknote,        color: '#34C759' },
  { title: 'Интеграции',  href: '/dashboard/integrations',        icon: Link2,           color: '#5856D6' },
  { title: 'Проекты',     href: '/dashboard/projects',            icon: FolderKanban,    color: '#007AFF' },
  { title: 'Пространства',href: '/projects',                      icon: FolderOpen,      color: '#5856D6' },
]

function NavItemRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.href === '/dashboard'
    ? pathname === item.href
    : pathname.startsWith(item.href)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={`rounded-xl px-2 py-2 h-auto transition-all duration-150 ${
          isActive
            ? 'bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm text-primary font-medium'
            : 'hover:bg-muted text-foreground/80'
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
}

function CollapsibleGroup({
  label,
  items,
  pathname,
  defaultOpen = false,
}: {
  label: string
  items: NavItem[]
  pathname: string
  defaultOpen?: boolean
}) {
  // Auto-open if any child is active
  const hasActive = items.some(item =>
    item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
  )
  const [open, setOpen] = useState(defaultOpen || hasActive)

  return (
    <SidebarGroup className="py-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-2 mb-1 py-1 group"
      >
        <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-auto py-0 pointer-events-none">
          {label}
        </SidebarGroupLabel>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {items.map((item) => (
              <NavItemRow key={item.href} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

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
    <Sidebar variant="inset" className="border-r border-border w-[240px]">
      {/* Logo */}
      <SidebarHeader className="pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                  <Wallet className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-base tracking-tight">DreamWallet</span>
                  <span className="text-[11px] text-muted-foreground font-medium">Управление финансами</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation — 4 groups */}
      <SidebarContent className="px-2 gap-0">
        {/* Primary — always visible */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {primaryItems.map((item) => (
                <NavItemRow key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Finance — collapsible */}
        <CollapsibleGroup label="Финансы" items={financeItems} pathname={pathname} defaultOpen />

        {/* Insights — collapsed by default */}
        <CollapsibleGroup label="Аналитика" items={insightsItems} pathname={pathname} />

        {/* Tools — collapsed by default */}
        <CollapsibleGroup label="Инструменты" items={toolsItems} pathname={pathname} />
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border pt-2 px-2">
        <SidebarMenu className="gap-0.5">
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-muted">
                <Link href="/admin" className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-destructive text-white">
                    <Shield className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-medium">Админка</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-muted">
              <Link href="/dashboard/settings" className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#636366] text-white">
                  <Settings className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium">Настройки</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-muted">
              <Link href="/dashboard/pricing" className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium">Тарифы</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="rounded-xl px-2 py-2 h-auto hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 transition-colors"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-muted">
                  <LogOut className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium truncate">{user?.name ?? 'Выйти'}</span>
                  {user?.email && <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>}
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
