'use client'

import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Plus, Users, Receipt } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function participantName(p: { user?: { name: string | null } | null; externalName?: string | null }) {
  return p.user?.name ?? p.externalName ?? 'Участник'
}

export default function SplitGroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [showAddExpense, setShowAddExpense] = useState(false)

  const { data: group, isLoading, refetch } = trpc.split.getGroup.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/splits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <div className="glass-card card-default rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Группа не найдена</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/splits" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{group.name}</h1>
        </div>
        <Button onClick={() => setShowAddExpense(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Добавить расход
        </Button>
      </div>

      {/* Participants */}
      <div className="glass-card card-default rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Участники</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.participants.map((p) => (
            <Badge key={p.id} variant="secondary">
              {participantName(p)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Expenses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Расходы</h2>
        </div>

        {!group.expenses?.length ? (
          <div className="glass-card card-default rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Пока нет расходов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {group.expenses.map((expense) => (
              <div key={expense.id} className="glass-card card-default rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Оплатил: {participantName(expense.paidBy)}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {Number(expense.amount).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                {expense.shares && expense.shares.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {expense.shares.map((share) => (
                      <span key={share.participantId} className="text-xs text-muted-foreground">
                        {Number(share.amount).toLocaleString('ru-RU')} ₽
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
