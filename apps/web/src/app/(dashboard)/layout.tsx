export const dynamic = 'force-dynamic'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { GlobalSearch } from '@/components/layout/global-search'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { Separator } from '@/components/ui/separator'
import { SessionGuard } from '@/components/layout/SessionGuard'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { BottomNav } from '@/components/layout/BottomNav'
import { CategorySeeder } from '@/components/layout/CategorySeeder'
import { MobileMainWrapper } from '@/components/layout/MobileMainWrapper'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header — frosted glass */}
        <header className="flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 sticky top-0 z-40">
          {/* Desktop: sidebar trigger + workspace + search */}
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:flex" />
          <div className="hidden md:flex">
            <WorkspaceSwitcher />
          </div>
          {/* Mobile: minimal — just logo icon */}
          <div className="md:hidden flex items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl gradient-hero text-white">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <GlobalSearch />
            </div>
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-6">
          <MobileMainWrapper>
            {children}
          </MobileMainWrapper>
        </main>
      </SidebarInset>
      <SessionGuard />
      <CategorySeeder />
      <InstallPrompt />
      <div className="hidden md:block">
        <QuickAddFAB />
      </div>
      <BottomNav />
    </SidebarProvider>
  )
}
