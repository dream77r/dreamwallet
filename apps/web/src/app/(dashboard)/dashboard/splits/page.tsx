'use client'

import { trpc } from '@/lib/trpc/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Scissors, Plus, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Деление расходов</h1>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Новая группа
        </Button>
      </div>

      {showCreate && (
        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <div className="flex gap-2">
              <Input placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} />
              <Button onClick={() => createMutation.mutate({ name })} disabled={!name}>Создать</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!groups?.length && !showCreate && (
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center space-y-3">
            <Scissors className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500">Создайте группу для деления расходов</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups?.map(group => (
          <Link key={group.id} href={`/dashboard/splits/${group.id}`}>
            <Card className="rounded-3xl hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{group.participants.length} участников</span>
                      <span className="mx-1">·</span>
                      <span>{group._count.expenses} расходов</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
