'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ArrowUpRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ProjectStatus = 'active' | 'archived' | 'paused'

interface Project {
  id: number
  name: string
  description: string
  status: ProjectStatus
  color: string
  monthRevenue: number
  monthExpenses: number
  totalRevenue: number
  createdAt: string
  transactionCount: number
}

const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Freelance Design',
    description: 'Дизайн-проекты для клиентов — логотипы, UI/UX, брендинг',
    status: 'active',
    color: 'bg-purple-500',
    monthRevenue: 45000,
    monthExpenses: 8200,
    totalRevenue: 380000,
    createdAt: 'янв 2025',
    transactionCount: 47,
  },
  {
    id: 2,
    name: 'Telegram Bot',
    description: 'Разработка и поддержка Telegram-ботов на заказ',
    status: 'active',
    color: 'bg-blue-500',
    monthRevenue: 28000,
    monthExpenses: 3500,
    totalRevenue: 142000,
    createdAt: 'июн 2025',
    transactionCount: 23,
  },
  {
    id: 3,
    name: 'Онлайн-курс',
    description: 'Курс по финансовой грамотности для начинающих',
    status: 'active',
    color: 'bg-green-500',
    monthRevenue: 18500,
    monthExpenses: 4300,
    totalRevenue: 87000,
    createdAt: 'окт 2025',
    transactionCount: 31,
  },
  {
    id: 4,
    name: 'Сдача квартиры',
    description: 'Доход от аренды однокомнатной квартиры в Москве',
    status: 'active',
    color: 'bg-orange-500',
    monthRevenue: 35000,
    monthExpenses: 6800,
    totalRevenue: 420000,
    createdAt: 'янв 2024',
    transactionCount: 12,
  },
  {
    id: 5,
    name: 'Dropshipping',
    description: 'Интернет-магазин спортивных товаров на маркетплейсах',
    status: 'paused',
    color: 'bg-gray-400',
    monthRevenue: 0,
    monthExpenses: 1200,
    totalRevenue: 95000,
    createdAt: 'мар 2025',
    transactionCount: 68,
  },
  {
    id: 6,
    name: 'Мобильное приложение',
    description: 'Личный проект — приложение для трекинга привычек (закрыт)',
    status: 'archived',
    color: 'bg-gray-300',
    monthRevenue: 0,
    monthExpenses: 0,
    totalRevenue: 12000,
    createdAt: 'фев 2024',
    transactionCount: 15,
  },
]

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Активен', className: 'bg-green-100 text-green-700' },
  paused: { label: 'На паузе', className: 'bg-yellow-100 text-yellow-700' },
  archived: { label: 'В архиве', className: 'bg-gray-100 text-gray-600' },
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ProjectsPage() {
  const activeProjects = mockProjects.filter(p => p.status === 'active')
  const totalMonthRevenue = activeProjects.reduce((s, p) => s + p.monthRevenue, 0)
  const totalMonthExpenses = activeProjects.reduce((s, p) => s + p.monthExpenses, 0)
  const totalMonthProfit = totalMonthRevenue - totalMonthExpenses

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Проекты</h1>
          <p className="text-muted-foreground text-sm">{activeProjects.length} активных проектов</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Создать проект
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Доходы за месяц</p>
            <p className="text-xl font-semibold text-green-600">+{formatAmount(totalMonthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Расходы за месяц</p>
            <p className="text-xl font-semibold text-red-600">-{formatAmount(totalMonthExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-xs mb-1">Прибыль за месяц</p>
            <p className={`text-xl font-semibold ${totalMonthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalMonthProfit >= 0 ? '+' : ''}{formatAmount(totalMonthProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((project) => {
          const profit = project.monthRevenue - project.monthExpenses
          const margin = project.monthRevenue > 0
            ? Math.round((profit / project.monthRevenue) * 100)
            : 0

          return (
            <Card key={project.id} className={`relative overflow-hidden ${project.status === 'archived' ? 'opacity-60' : ''}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${project.color}`} />

              <CardHeader className="pb-3 pt-7">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${project.color} text-white flex-shrink-0`}>
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">с {project.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[project.status].className}`}>
                      {statusConfig[project.status].label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Открыть</DropdownMenuItem>
                        <DropdownMenuItem>Редактировать</DropdownMenuItem>
                        <DropdownMenuItem>Транзакции проекта</DropdownMenuItem>
                        {project.status === 'active' && (
                          <DropdownMenuItem>Приостановить</DropdownMenuItem>
                        )}
                        {project.status !== 'archived' && (
                          <DropdownMenuItem>В архив</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="text-xs leading-relaxed line-clamp-2 mt-1">
                  {project.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Separator className="mb-4" />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Доходы</p>
                    <p className="text-sm font-semibold text-green-600">
                      {project.monthRevenue > 0 ? `+${formatAmount(project.monthRevenue)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Расходы</p>
                    <p className="text-sm font-semibold text-red-600">
                      {project.monthExpenses > 0 ? `-${formatAmount(project.monthExpenses)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Прибыль</p>
                    <p className={`text-sm font-semibold ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {profit !== 0 ? (profit > 0 ? '+' : '') + formatAmount(profit) : '—'}
                    </p>
                  </div>
                </div>

                {project.monthRevenue > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.transactionCount} транзакций</span>
                    <div className="flex items-center gap-1">
                      {margin >= 50 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-orange-500" />
                      )}
                      <span>Маржа {margin}%</span>
                    </div>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Всего выручки: <span className="font-medium text-foreground">{formatAmount(project.totalRevenue)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Add project card */}
        <Card className="flex items-center justify-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors min-h-[240px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Создать проект</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
