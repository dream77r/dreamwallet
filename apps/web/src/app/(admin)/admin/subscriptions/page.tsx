'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'

const planColors: Record<string, string> = {
  FREE: 'bg-slate-100 text-slate-700 border-slate-300',
  PRO: 'bg-blue-100 text-blue-700 border-blue-300',
  BUSINESS: 'bg-purple-100 text-purple-700 border-purple-300',
  CUSTOM: 'bg-amber-100 text-amber-700 border-amber-300',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-300',
  TRIALING: 'bg-blue-100 text-blue-700 border-blue-300',
  PAST_DUE: 'bg-orange-100 text-orange-700 border-orange-300',
  CANCELLED: 'bg-red-100 text-red-700 border-red-300',
}

type PlanFilter = 'ALL' | 'FREE' | 'PRO' | 'BUSINESS' | 'CUSTOM'
type StatusFilter = 'ALL' | 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED'

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  const { data, isLoading } = trpc.admin.listSubscriptions.useQuery({
    search: search || undefined,
    plan: planFilter === 'ALL' ? undefined : planFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    limit: 20,
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Подписки</h1>
        <p className="text-sm text-muted-foreground">Все подписки пользователей</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Поиск по email или имени..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="h-9 w-64"
        />
        <Select
          value={planFilter}
          onValueChange={(v) => {
            setPlanFilter(v as PlanFilter)
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Тариф" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все тарифы</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="BUSINESS">BUSINESS</SelectItem>
            <SelectItem value="CUSTOM">CUSTOM</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все статусы</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="TRIALING">TRIALING</SelectItem>
            <SelectItem value="PAST_DUE">PAST_DUE</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Конец периода</TableHead>
                <TableHead>Дата создания</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Подписки не найдены
                  </TableCell>
                </TableRow>
              )}
              {data?.subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sub.user.email}</div>
                      {sub.user.name && (
                        <div className="text-xs text-muted-foreground">{sub.user.name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={planColors[sub.plan]}>
                      {sub.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[sub.status]}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString('ru-RU')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Всего: {data?.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
