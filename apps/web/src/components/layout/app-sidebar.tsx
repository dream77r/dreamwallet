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
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PieChart,
  FolderKanban,
  Target,
  Upload,
  Settings,
  Wallet,
  LogOut,
  Sparkles,
  Shield,
} from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

const mainNav = [
  { title: 'Обзор', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Транзакции', href: '/dashboard/transactions', icon: ArrowLeftRight },
  { title: 'Счета', href: '/dashboard/accounts', icon: CreditCard },
  { title: 'Бюджеты', href: '/dashboard/budgets', icon: Target },
  { title: 'Аналитика', href: '/dashboard/analytics', icon: PieChart },
  { title: 'Импорт', href: '/dashboard/import', icon: Upload },
]

const projectNav = [
  { title: 'Проекты', href: '/dashboard/projects', icon: FolderKanban },
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
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">DreamWallet</span>
                  <span className="text-xs text-muted-foreground">Финансы</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Личные финансы</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Бизнес</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')}>
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  <span>Админка</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard/pricing'}>
              <Link href="/dashboard/pricing">
                <Sparkles className="h-4 w-4" />
                <span>Тарифы</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard/settings'}>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
