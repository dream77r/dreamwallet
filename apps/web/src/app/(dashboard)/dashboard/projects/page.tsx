'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  FolderKanban,
  MoreHorizontal,
  Users,
  Wallet,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'

const PROJECT_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
]

function formatAmount(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getProjectColor(index: number, color?: string | null) {
  if (color) return color
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

export default function ProjectsPage() {
  const { data: projects, isLoading } = trpc.project.list.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Проекты</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : `${projects?.length ?? 0} проектов`}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Новый проект
        </Button>
      </div>

      {/* Project cards grid */}
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
            <FolderKanban className="h-10 w-10 mb-3" />
            <p className="font-medium mb-1">Нет проектов</p>
            <p className="text-sm">Создайте первый бизнес-проект для отслеживания финансов</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4" />
              Создать проект
            </Button>
          </Card>
        ) : (
          <>
            {projects?.map((project, index) => {
              const color = getProjectColor(index, project.color)
              const totalBalance = project.wallet?.accounts?.reduce(
                (sum, acc) => sum + Number(acc.balance), 0
              ) ?? 0

              return (
                <Card key={project.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />

                  <CardHeader className="pb-3 pt-7">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} text-white`}>
                          <FolderKanban className="h-5 w-5" />
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Открыть</DropdownMenuItem>
                          <DropdownMenuItem>Редактировать</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Архивировать</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Separator className="mb-4" />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Wallet className="h-3.5 w-3.5" />
                          <span>Баланс</span>
                        </div>
                        <span className={`text-sm font-semibold ${totalBalance < 0 ? 'text-red-600' : ''}`}>
                          {formatAmount(totalBalance, project.wallet?.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Users className="h-3.5 w-3.5" />
                          <span>Участники</span>
                        </div>
                        <span className="text-sm font-medium">{project._count?.members ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Создан</div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(project.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Add project card */}
            <Card className="flex items-center justify-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors min-h-[200px]">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Новый проект</p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
