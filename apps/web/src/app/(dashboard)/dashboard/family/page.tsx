'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, UserPlus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

function FamilyContent() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const [name, setName] = useState('')

  const { data: family, refetch } = trpc.family.get.useQuery()
  const createMutation = trpc.family.create.useMutation({ onSuccess: () => refetch() })
  const inviteMutation = trpc.family.invite.useMutation()
  const joinMutation = trpc.family.join.useMutation({ onSuccess: () => { refetch(); toast.success('Вы присоединились к семейному кошельку!') } })
  const removeMutation = trpc.family.removeMember.useMutation({ onSuccess: () => refetch() })
  const { data: spending } = trpc.family.getMemberSpending.useQuery(
    { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { enabled: !!family },
  )

  // Auto-join if invite token present
  if (inviteToken && !family) {
    joinMutation.mutate({ token: inviteToken })
  }

  if (!family) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Семейный кошелёк</h1>
        <div className="glass-card card-default rounded-2xl p-8 text-center space-y-4">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">Создайте семейный кошелёк для совместного управления финансами</p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <Input placeholder="Название (напр. Семья Поповых)" value={name} onChange={e => setName(e.target.value)} />
            <Button onClick={() => createMutation.mutate({ name })} disabled={!name || createMutation.isPending}>
              Создать
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{family.name}</h1>
        <Button variant="outline" size="sm" onClick={async () => {
          const result = await inviteMutation.mutateAsync()
          await navigator.clipboard.writeText(result.link)
          toast.success('Ссылка скопирована!')
        }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Пригласить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {family.members.map(member => {
          const memberSpending = spending?.find(s => s.userId === member.userId)
          return (
            <div key={member.id} className="glass-card card-default rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {(member.user.name ?? 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{member.user.name ?? member.user.email}</p>
                    <p className="text-xs text-muted-foreground">{member.role === 'OWNER' ? 'Владелец' : member.role === 'ADMIN' ? 'Админ' : 'Участник'}</p>
                  </div>
                </div>
                {member.role !== 'OWNER' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMutation.mutate({ memberId: member.id })}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              {memberSpending && (
                <div className="text-sm">
                  <p>Расходы: <span className="font-semibold">{memberSpending.spent.toLocaleString('ru-RU')} ₽</span></p>
                  {memberSpending.limit && (
                    <p className="text-muted-foreground">Лимит: {memberSpending.limit.toLocaleString('ru-RU')} ₽</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function FamilyPage() {
  return <Suspense><FamilyContent /></Suspense>
}
