'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserMinus } from 'lucide-react'

type FamilyRole = 'OWNER' | 'ADMIN' | 'MEMBER'

interface FamilyMemberCardProps {
  name: string
  email?: string
  role: FamilyRole
  spendingThisMonth: number
  spendingLimit?: number | null
  canRemove?: boolean
  onRemove?: () => void
}

const roleLabels: Record<FamilyRole, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Админ',
  MEMBER: 'Участник',
}

const roleVariants: Record<FamilyRole, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  MEMBER: 'outline',
}

export function FamilyMemberCard({
  name,
  email,
  role,
  spendingThisMonth,
  spendingLimit,
  canRemove,
  onRemove,
}: FamilyMemberCardProps) {
  const limitExceeded = spendingLimit != null && spendingThisMonth > spendingLimit
  const limitPercent =
    spendingLimit != null && spendingLimit > 0
      ? Math.min(100, (spendingThisMonth / spendingLimit) * 100)
      : null

  return (
    <Card className="rounded-3xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{name}</h3>
              <Badge variant={roleVariants[role]}>{roleLabels[role]}</Badge>
            </div>
            {email && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
            )}

            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Расходы за месяц</span>
                <span
                  className={`font-semibold tabular-nums ${
                    limitExceeded ? 'text-red-600' : ''
                  }`}
                >
                  {spendingThisMonth.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {spendingLimit != null && (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Лимит</span>
                    <span>{spendingLimit.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  {limitPercent !== null && (
                    <div className="bg-muted rounded-full h-1.5 mt-1">
                      <div
                        className={`rounded-full h-1.5 transition-all ${
                          limitExceeded ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${limitPercent}%` }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-500 shrink-0 ml-2"
              onClick={onRemove}
              title="Удалить участника"
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
