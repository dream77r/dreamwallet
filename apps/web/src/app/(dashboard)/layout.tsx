import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { GlobalSearch } from '@/components/layout/global-search'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { Separator } from '@/components/ui/separator'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <WorkspaceSwitcher />
          <div className="ml-auto flex items-center gap-2">
            <GlobalSearch />
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
      <OnboardingWizard />
      <InstallPrompt />
      <QuickAddFAB />
    </SidebarProvider>
  )
}
