import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { GlobalSearch } from '@/components/layout/global-search'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { Separator } from '@/components/ui/separator'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { BottomNav } from '@/components/layout/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* iOS-style header — frosted glass */}
        <header className="flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-xl border-b border-border px-4 sticky top-0 z-40">
          {/* Sidebar trigger — скрывается на мобильных */}
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:flex" />
          {/* WorkspaceSwitcher — только десктоп */}
          <div className="hidden md:flex">
            <WorkspaceSwitcher />
          </div>
          {/* Логотип на мобильных */}
          <div className="md:hidden flex items-center gap-2 font-semibold text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <span>DreamWallet</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <GlobalSearch />
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </SidebarInset>
      <OnboardingWizard />
      <InstallPrompt />
      {/* FAB только на десктопе, на мобиле — BottomNav с кнопкой + */}
      <div className="hidden md:block">
        <QuickAddFAB />
      </div>
      <BottomNav />
    </SidebarProvider>
  )
}
