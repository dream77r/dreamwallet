'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Bitcoin } from "lucide-react"
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PieChart,
  FolderKanban,
  FolderOpen,
  Target,
  Upload,
  Settings,
  Wallet,
  LogOut,
  Sparkles,
  Shield,
  Tag,
  Hash,
  Repeat2,
  Zap,
  Flag,
  TrendingUp,
  BrainCircuit,
  HandCoins,
  CalendarClock,
  Landmark,
} from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

const mainNav = [
  { title: 'Обзор', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Транзакции', href: '/dashboard/transactions', icon: ArrowLeftRight },
  { title: 'Счета', href: '/dashboard/accounts', icon: CreditCard },
  { title: 'Регулярные', href: '/dashboard/recurring', icon: Repeat2 },
  { title: 'Долги', href: '/dashboard/debts', icon: HandCoins },
  { title: 'Подписки', href: '/dashboard/subscriptions-tracker', icon: CalendarClock },
  { title: 'Бюджеты', href: '/dashboard/budgets', icon: Target },
  { title: 'Категории', href: '/dashboard/categories', icon: Tag },
  { title: 'Теги', href: '/dashboard/tags', icon: Hash },
  { title: 'Авто-правила', href: '/dashboard/auto-rules', icon: Zap },
  { title: 'Цели', href: '/dashboard/goals', icon: Flag },
  { title: 'Прогноз', href: '/dashboard/forecast', icon: TrendingUp },
  { title: 'Аналитика', href: '/dashboard/analytics', icon: PieChart },
  { title: 'Активы', href: '/dashboard/net-worth', icon: Landmark },
  { title: 'Крипто', href: '/dashboard/crypto', icon: Bitcoin },
  { title: 'AI Советник', href: '/dashboard/ai-chat', icon: BrainCircuit },
  { title: 'Импорт', href: '/dashboard/import', icon: Upload },
]

const projectNav = [
  { title: 'Проекты', href: '/dashboard/projects', icon: FolderKanban },
  { title: 'Пространства', href: '/projects', icon: FolderOpen },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === 'ADMIN'

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <Sidebar variant="inset" className="border-r border-gray-100">
      <SidebarHeader className="border-b border-gray-100 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Wallet className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-base tracking-tight">DreamWallet</span>
                  <span className="text-xs text-muted-foreground">Финансы</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">
            Личные финансы
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`rounded-xl mx-1 px-3 py-2.5 transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 bg-gray-100" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">
            Бизнес
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNav.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`rounded-xl mx-1 px-3 py-2.5 transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 pt-2 px-1">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/admin')}
                className="rounded-xl mx-1 px-3 py-2.5 text-gray-700 hover:bg-gray-100"
              >
                <Link href="/admin">
                  <Shield className="h-5 w-5" strokeWidth={1.5} />
                  <span>Админка</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/dashboard/pricing'}
              className="rounded-xl mx-1 px-3 py-2.5 text-gray-700 hover:bg-gray-100"
            >
              <Link href="/dashboard/pricing">
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
                <span>Тарифы</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/dashboard/settings'}
              className="rounded-xl mx-1 px-3 py-2.5 text-gray-700 hover:bg-gray-100"
            >
              <Link href="/dashboard/settings">
                <Settings className="h-5 w-5" strokeWidth={1.5} />
                <span>Настройки</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="rounded-xl mx-1 px-3 py-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
              <span>Выйти</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
