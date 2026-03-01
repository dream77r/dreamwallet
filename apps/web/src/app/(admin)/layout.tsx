import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Shield, Users, LayoutDashboard, ArrowLeft, Sparkles } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const session = await auth.api.getSession({ headers: headerList })

  const role = (session?.user as Record<string, unknown>)?.role
  if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            <span>Админка</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Обзор
              </span>
            </Link>
            <Link
              href="/admin/users"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Пользователи
              </span>
            </Link>
            <Link
              href="/admin/plans"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Тарифы
              </span>
            </Link>
            <Link
              href="/admin/ai"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                AI-модели
              </span>
            </Link>
          </div>
          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Назад в приложение
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  )
}
