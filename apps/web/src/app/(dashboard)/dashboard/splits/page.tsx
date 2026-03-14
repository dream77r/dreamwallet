'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scissors, Plus, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default function SplitsPage() {
  const [name, setName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: groups, refetch } = trpc.split.listGroups.useQuery()
  const createMutation = trpc.split.createGroup.useMutation({
    onSuccess: () => { refetch(); setName(''); setShowCreate(false); toast.success('Группа создана!') },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Деление расходов"
        actions={
          <Button onClick={() => setShowCreate(!showCreate)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Новая группа
          </Button>
        }
      />

      {showCreate && (
        <div className="glass-card card-default rounded-2xl p-5">
          <div className="flex gap-2">
            <Input placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} />
            <Button onClick={() => createMutation.mutate({ name })} disabled={!name}>Создать</Button>
          </div>
        </div>
      )}

      {!groups?.length && !showCreate && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">✂️</span>
          <p className="text-lg font-semibold mb-1">Нет групп</p>
          <p className="text-sm text-muted-foreground mb-4">Создайте группу, чтобы делить расходы с друзьями</p>
          <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-primary">Создать группу →</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups?.map(group => (
          <Link key={group.id} href={`/dashboard/splits/${group.id}`}>
            <div className="glass-card card-interactive rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{group.participants.length} участников</span>
                    <span className="mx-1">·</span>
                    <span>{group._count.expenses} расходов</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/70" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
