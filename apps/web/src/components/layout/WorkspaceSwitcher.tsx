'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, FolderOpen, Home, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'

export function WorkspaceSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: projects } = trpc.project.list.useQuery()

  const isPersonal = !pathname.startsWith('/projects/')
  const activeProjectId = pathname.startsWith('/projects/') ? pathname.split('/')[2] : null
  const activeProject = projects?.find((p) => p.id === activeProjectId)

  const currentLabel = activeProject
    ? `${activeProject.icon ?? '💼'} ${activeProject.name}`
    : '🏠 Личный'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 max-w-[200px]">
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => router.push('/dashboard')}
          className="gap-2"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span className="flex-1">Личный</span>
          {isPersonal && !activeProjectId && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        {projects && projects.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="gap-2"
              >
                <span className="text-base shrink-0">{project.icon ?? '💼'}</span>
                <span className="flex-1 truncate">{project.name}</span>
                {activeProjectId === project.id && <Check className="h-4 w-4 shrink-0" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <CreateProjectDialog
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="gap-2 text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              Новое пространство
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
