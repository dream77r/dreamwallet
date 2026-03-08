'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Пространства</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Загрузка...' : `${projects?.length ?? 0} пространств`}
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : projects?.length === 0 ? (
          <Card className="col-span-full flex flex-col items-center justify-center py-16 border-dashed text-muted-foreground">
            <FolderOpen className="h-10 w-10 mb-3" />
            <p className="font-medium mb-1">Нет пространств</p>
            <p className="text-sm mb-4">Создайте первое пространство для совместного учёта финансов</p>
            <CreateProjectDialog />
          </Card>
        ) : (
          <>
            {projects?.map((project) => {
              const totalBalance =
                project.wallet?.accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0
              const accountCount = project.wallet?.accounts?.length ?? 0

              return (
                <Card key={project.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                          {project.icon ?? '💼'}
                        </div>
                        <div>
                          <CardTitle className="text-base">{project.name}</CardTitle>
                          {project.description && (
                            <CardDescription className="text-xs line-clamp-1">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Separator className="mb-4" />
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
                  </CardContent>
                </Card>
              )
            })}

            <Card className="flex items-center justify-center border-dashed hover:bg-muted/50 transition-colors min-h-[200px]">
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
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
