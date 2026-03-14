'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from '@/components/ui/sidebar'
import {
  Activity, BarChart3, FolderOpen, Target, Flag, HandCoins,
  CalendarClock, PercentCircle, BrainCircuit, Upload, Tag,
  Zap, Trophy, Settings, Sparkles, Wallet, LogOut, Shield,
  ChevronDown,
} from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

type NavItem = { title: string; href: string; icon: React.ElementType; color: string }

// ── Main navigation (always visible, no collapse) ──
const mainItems: NavItem[] = [
  { title: 'Поток',        href: '/dashboard',              icon: Activity,    color: '#667eea' },
  { title: 'Аналитика',    href: '/dashboard/analytics',    icon: BarChart3,   color: '#4facfe' },
  { title: 'Пространства', href: '/dashboard/spaces',       icon: FolderOpen,  color: '#764ba2' },
]

// ── Finance (collapsible) ──
const financeItems: NavItem[] = [
  { title: 'Бюджеты',      href: '/dashboard/budgets',              icon: Target,        color: '#FF9500' },
  { title: 'Цели',         href: '/dashboard/goals',                icon: Flag,          color: '#764ba2' },
  { title: 'Долги',        href: '/dashboard/debts',                icon: HandCoins,     color: '#FF3B30' },
  { title: 'Подписки',     href: '/dashboard/subscriptions-tracker', icon: CalendarClock, color: '#FF2D55' },
  { title: 'Кэшбэк',      href: '/dashboard/cashback',             icon: PercentCircle, color: '#30D158' },
]

// ── Tools (collapsible) ──
const toolsItems: NavItem[] = [
  { title: 'AI Советник',  href: '/dashboard/ai-chat',       icon: BrainCircuit, color: '#764ba2' },
  { title: 'Импорт',       href: '/dashboard/import',        icon: Upload,       color: '#636366' },
  { title: 'Категории',    href: '/dashboard/categories',    icon: Tag,          color: '#FF6B35' },
  { title: 'Авто-правила', href: '/dashboard/auto-rules',    icon: Zap,          color: '#34C759' },
  { title: 'Достижения',   href: '/dashboard/achievements',  icon: Trophy,       color: '#FFD60A' },
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
        className={`group/navitem rounded-xl px-2 py-2 h-auto transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-primary/12 via-primary/8 to-transparent shadow-sm text-primary font-semibold'
            : 'hover:bg-muted/60 text-foreground/75 hover:text-foreground'
        }`}
      >
        <Link href={item.href} className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-white transition-transform duration-200 group-hover/navitem:scale-110"
            style={{ backgroundColor: item.color }}
          >
            <item.icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <span className="text-[14px] font-medium transition-all duration-200 group-hover/navitem:translate-x-0.5">{item.title}</span>
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
    <Sidebar variant="inset" className="border-r border-sidebar-border w-[240px]">
      {/* Logo */}
      <SidebarHeader className="pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-hero text-white shadow-sm">
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

      {/* Navigation */}
      <SidebarContent className="px-2 gap-0">
        {/* Main — always visible, no collapsible header */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainItems.map((item) => (
                <NavItemRow key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <CollapsibleGroup label="Финансы" items={financeItems} pathname={pathname} defaultOpen />
        <CollapsibleGroup label="Инструменты" items={toolsItems} pathname={pathname} />
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border pt-2 px-2">
        <SidebarMenu className="gap-0.5">
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-muted/60">
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
            <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-muted/60">
              <Link href="/dashboard/settings" className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#636366] text-white">
                  <Settings className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium">Настройки</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl px-2 py-2 h-auto hover:bg-muted/60">
              <Link href="/dashboard/pricing" className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] gradient-hero text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium">Тарифы</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="rounded-xl px-2 py-2 h-auto hover:bg-expense/10 text-muted-foreground hover:text-expense transition-colors"
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
