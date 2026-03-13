'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectSettingsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const { data: project, isLoading } = trpc.project.get.useQuery({ id })
  const { data: rules } = trpc.income.getRules.useQuery({ projectId: id })

  const utils = trpc.useUtils()

  // General settings
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [initialized, setInitialized] = useState(false)

  if (project && !initialized) {
    setName(project.name)
    setDescription(project.description ?? '')
    setIcon(project.icon ?? '')
    setInitialized(true)
  }

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => void utils.project.get.invalidate({ id }),
  })

  const upsertRuleMutation = trpc.income.upsertRule.useMutation({
    onSuccess: () => void utils.income.getRules.invalidate({ projectId: id }),
  })

  const deleteRuleMutation = trpc.income.deleteRule.useMutation({
    onSuccess: () => void utils.income.getRules.invalidate({ projectId: id }),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="font-medium">Пространство не найдено</p>
      </div>
    )
  }

  const isOwner = project.ownerId === project.members.find(m => m.role === 'OWNER')?.user.id

  // Calculate total percentage
  const totalPct = (rules ?? [])
    .filter(r => r.type === 'PERCENTAGE')
    .reduce((sum, r) => sum + Number(r.value), 0)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Настройки</h1>
      </div>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Общие</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate({
                id,
                name,
                description: description || undefined,
                icon: icon || undefined,
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Иконка (emoji)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="💼" className="w-20" />
            </div>
            {updateMutation.error && (
              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
            )}
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Income rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Правила дохода</CardTitle>
            {totalPct > 0 && (
              <Badge variant={totalPct > 100 ? 'destructive' : 'secondary'}>
                {totalPct}% распределено
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {project.members.map((member) => {
              const rule = (rules ?? []).find(r => r.memberId === member.id)
              const isOwnerMember = member.role === 'OWNER'

              if (isOwnerMember) {
                return (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                        {member.user.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.user.name ?? member.user.email}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Badge variant="default">Остаток</Badge>
                  </div>
                )
              }

              return (
                <IncomeRuleRow
                  key={member.id}
                  projectId={id}
                  memberId={member.id}
                  memberName={member.user.name ?? member.user.email}
                  memberRole={member.role}
                  currentType={rule?.type ?? null}
                  currentValue={rule ? Number(rule.value) : null}
                  onSave={(type, value) => {
                    upsertRuleMutation.mutate({
                      projectId: id,
                      memberId: member.id,
                      type,
                      value,
                    })
                  }}
                  onDelete={() => {
                    deleteRuleMutation.mutate({ projectId: id, memberId: member.id })
                  }}
                  isSaving={upsertRuleMutation.isPending}
                />
              )
            })}
          </div>
          {upsertRuleMutation.error && (
            <p className="text-sm text-destructive mt-2">{upsertRuleMutation.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function IncomeRuleRow({
  projectId,
  memberId,
  memberName,
  memberRole,
  currentType,
  currentValue,
  onSave,
  onDelete,
  isSaving,
}: {
  projectId: string
  memberId: string
  memberName: string
  memberRole: string
  currentType: string | null
  currentValue: number | null
  onSave: (type: 'PERCENTAGE' | 'FIXED', value: number) => void
  onDelete: () => void
  isSaving: boolean
}) {
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>(
    (currentType as 'PERCENTAGE' | 'FIXED') ?? 'PERCENTAGE'
  )
  const [value, setValue] = useState(currentValue?.toString() ?? '')

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold shrink-0">
        {memberName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-[100px]">
        <p className="text-sm font-medium">{memberName}</p>
        <p className="text-xs text-muted-foreground">{memberRole}</p>
      </div>
      <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PERCENTAGE">Процент</SelectItem>
          <SelectItem value="FIXED">Фикс. сумма</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={type === 'PERCENTAGE' ? '10' : '50000'}
        className="w-[100px]"
      />
      <Button
        size="sm"
        onClick={() => onSave(type, parseFloat(value) || 0)}
        disabled={isSaving || !value}
      >
        <Save className="h-3.5 w-3.5" />
      </Button>
      {currentType && (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
          &times;
        </Button>
      )}
    </div>
  )
}
