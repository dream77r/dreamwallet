'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { FolderOpen, Users, Wallet } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ProjectsPage() {
  const { data: projects, isLoading } = trpc.project.list.useQuery()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Пространства"
        description={isLoading ? 'Загрузка...' : `${projects?.length ?? 0} пространств`}
        actions={<CreateProjectDialog />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card card-default rounded-2xl p-6">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))
        ) : projects?.length === 0 ? (
          <div className="glass-card card-default rounded-2xl col-span-full flex flex-col items-center justify-center py-16 border-dashed text-muted-foreground">
            <FolderOpen className="h-10 w-10 mb-3" />
            <p className="font-medium mb-1">Нет пространств</p>
            <p className="text-sm mb-4">Создайте первое пространство для совместного учёта финансов</p>
            <CreateProjectDialog />
          </div>
        ) : (
          <>
            {projects?.map((project) => {
              const totalBalance =
                project.wallet?.accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0
              const accountCount = project.wallet?.accounts?.length ?? 0

              return (
                <div key={project.id} className="glass-card card-default card-hover rounded-2xl overflow-hidden">
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                          {project.icon ?? '💼'}
                        </div>
                        <div>
                          <p className="font-semibold text-base">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="border-t border-border/50 mb-4" />
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Wallet className="h-3.5 w-3.5" />
                          <span>Баланс</span>
                        </div>
                        <span className={`text-sm font-semibold ${totalBalance < 0 ? 'text-destructive' : ''}`}>
                          {formatAmount(totalBalance, project.wallet?.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Wallet className="h-3.5 w-3.5" />
                          <span>Счетов</span>
                        </div>
                        <span className="text-sm font-medium">{accountCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Users className="h-3.5 w-3.5" />
                          <span>Участников</span>
                        </div>
                        <span className="text-sm font-medium">{project._count?.members ?? 0}</span>
                      </div>
                    </div>
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/projects/${project.id}`}>Открыть</Link>
                    </Button>
                  </div>
                </div>
              )
            })}

            <div className="glass-card card-default rounded-2xl flex items-center justify-center border-dashed hover:bg-muted/30 transition-colors min-h-[200px]">
              <CreateProjectDialog
                trigger={
                  <button className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Новое пространство</span>
                  </button>
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
