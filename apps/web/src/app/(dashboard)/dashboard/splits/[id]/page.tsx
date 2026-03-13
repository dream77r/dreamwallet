'use client'

import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/splits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Группа не найдена</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/splits" className="text-gray-400 hover:text-gray-600">
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
      <Card className="rounded-3xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Участники</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.participants.map((p) => (
              <Badge key={p.id} variant="secondary">
                {participantName(p)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold">Расходы</h2>
        </div>

        {!group.expenses?.length ? (
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Пока нет расходов</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {group.expenses.map((expense) => (
              <Card key={expense.id} className="rounded-3xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-500">
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
                        <span key={share.participantId} className="text-xs text-gray-400">
                          {Number(share.amount).toLocaleString('ru-RU')} ₽
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
