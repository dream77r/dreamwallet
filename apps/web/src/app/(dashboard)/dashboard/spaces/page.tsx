'use client'

import Link from 'next/link'
import {
  FolderKanban,
  Users,
  Scissors,
  Plus,
  Wallet,
  Receipt,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'
import { formatAmount } from '@/lib/format'

/* eslint-disable @typescript-eslint/no-explicit-any */

function MemberAvatars({ members }: { members: Array<{ user: { id: string; name: string | null } }> }) {
  const shown = members.slice(0, 4)
  const extra = members.length - shown.length

  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <div
          key={m.user.id}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold"
          title={m.user.name ?? ''}
        >
          {m.user.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold">
          +{extra}
        </div>
      )}
    </div>
  )
}

function ParticipantAvatars({ participants }: { participants: Array<{ id: string; externalName: string | null; user: { id: string; name: string | null } | null }> }) {
  const shown = participants.slice(0, 4)
  const extra = participants.length - shown.length

  return (
    <div className="flex -space-x-2">
      {shown.map((p) => {
        const name = p.user?.name ?? p.externalName ?? '?'
        return (
          <div
            key={p.id}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold"
            title={name}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )
      })}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold">
          +{extra}
        </div>
      )}
    </div>
  )
}

const PROJECT_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
]

function getProjectBalance(project: any): number {
  return (project.wallet?.accounts ?? []).reduce(
    (sum: number, acc: any) => sum + Number(acc.balance ?? 0),
    0,
  )
}

function getFamilyBalance(fw: any): number {
  return (fw.wallet?.accounts ?? []).reduce(
    (sum: number, acc: any) => sum + Number(acc.balance ?? 0),
    0,
  )
}

const createMenu = (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        Создать
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem asChild>
        <Link href="/projects">
          <FolderKanban className="h-4 w-4 mr-2" />
          Проект
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/family">
          <Users className="h-4 w-4 mr-2" />
          Семья
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/splits">
          <Scissors className="h-4 w-4 mr-2" />
          Деление
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

export default function SpacesPage() {
  const { data, isLoading } = trpc.spaces.list.useQuery()

  const projects = data?.projects ?? []
  const familyWallets = data?.familyWallets ?? []
  const splitGroups = data?.splitGroups ?? []

  const isEmpty = !isLoading && projects.length === 0 && familyWallets.length === 0 && splitGroups.length === 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="Пространства"
        description="Проекты, семья и совместные расходы"
        actions={createMenu}
      />

      {isLoading && (
        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2].map((i) => (
                  <div key={i} className="glass-card card-default rounded-2xl p-5">
                    <Skeleton className="h-5 w-32 mb-3" />
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 animate-fade-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-hero text-white">
            <FolderOpen className="h-8 w-8" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold">Нет пространств</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Создайте бизнес-проект, семейный бюджет или группу для деления расходов.
            </p>
          </div>
          {createMenu}
        </div>
      )}

      {/* Business Projects */}
      {projects.length > 0 && (
        <section className="space-y-4 animate-fade-up">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-purple-500 text-white">
              <FolderKanban className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Бизнес-проекты</h2>
            <span className="text-xs text-muted-foreground ml-1">{projects.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any, index: number) => {
              const color = project.color ?? PROJECT_COLORS[index % PROJECT_COLORS.length]
              const totalBalance = getProjectBalance(project)
              const members = project.members ?? []

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="glass-card card-default rounded-2xl relative overflow-hidden transition-transform hover:scale-[1.02]">
                    <div className={`${color} px-5 pt-5 pb-4`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-white truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-white/70 line-clamp-1">{project.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-white/60">Баланс</p>
                        <p className="text-xl font-bold text-white">
                          {formatAmount(totalBalance, project.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between">
                      <MemberAvatars members={members} />
                      <span className="text-xs text-muted-foreground">
                        {members.length} участн.
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Family Wallets */}
      {familyWallets.length > 0 && (
        <section className="space-y-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-pink-500 text-white">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Семья</h2>
            <span className="text-xs text-muted-foreground ml-1">{familyWallets.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {familyWallets.map((fw: any) => {
              const totalBalance = getFamilyBalance(fw)
              const members = fw.members ?? []

              return (
                <Link key={fw.id} href="/dashboard/family">
                  <div className="glass-card card-default rounded-2xl overflow-hidden transition-transform hover:scale-[1.02]">
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold truncate">{fw.name}</p>
                          <p className="text-xs text-muted-foreground">Семейный бюджет</p>
                        </div>
                      </div>
                      <div className="h-px bg-border mb-3" />
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Wallet className="h-3.5 w-3.5" />
                            <span>Баланс</span>
                          </div>
                          <span className={`text-sm font-semibold ${totalBalance < 0 ? 'text-expense' : ''}`}>
                            {formatAmount(totalBalance, fw.currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Участники</span>
                          <MemberAvatars members={members} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Split Groups */}
      {splitGroups.length > 0 && (
        <section className="space-y-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-orange-500 text-white">
              <Scissors className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Деление расходов</h2>
            <span className="text-xs text-muted-foreground ml-1">{splitGroups.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {splitGroups.map((sg: any) => (
              <Link key={sg.id} href={`/dashboard/splits/${sg.id}`}>
                <div className="glass-card card-default rounded-2xl overflow-hidden transition-transform hover:scale-[1.02]">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold truncate">{sg.name}</p>
                        <p className="text-xs text-muted-foreground">Группа расходов</p>
                      </div>
                    </div>
                    <div className="h-px bg-border mb-3" />
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Расходы</span>
                        </div>
                        <span className="text-sm font-medium">{sg._count?.expenses ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Участники</span>
                        <ParticipantAvatars participants={sg.participants ?? []} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
