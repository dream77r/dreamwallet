'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, FileSpreadsheet, Pencil, Trash2, Check, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

export default function CsvTemplatesPage() {
  const utils = trpc.useUtils()
  const { data: templates, isLoading } = trpc.csvTemplates.list.useQuery()
  const renameMutation = trpc.csvTemplates.rename.useMutation({
    onSuccess: () => {
      utils.csvTemplates.list.invalidate()
      toast.success('Шаблон переименован')
      setEditingId(null)
    },
    onError: (e) => toast.error(e.message),
  })
  const deleteMutation = trpc.csvTemplates.delete.useMutation({
    onSuccess: () => {
      utils.csvTemplates.list.invalidate()
      toast.success('Шаблон удалён')
      setDeleteId(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function startEdit(id: string, currentName: string) {
    setEditingId(id)
    setEditName(currentName)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  function submitRename() {
    if (!editingId || !editName.trim()) return
    renameMutation.mutate({ id: editingId, name: editName.trim() })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/dashboard/settings">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Шаблоны CSV</h1>
          <p className="text-muted-foreground text-sm">Управление сохранёнными маппингами для импорта</p>
        </div>
      </div>

      <div className="glass-card card-default rounded-2xl">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold">Сохранённые шаблоны</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Шаблоны создаются на странице{' '}
            <Link href="/dashboard/import" className="underline underline-offset-2">
              импорта CSV
            </Link>
            . Здесь вы можете переименовать или удалить их.
          </p>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <FileSpreadsheet className="h-10 w-10" />
              <p className="text-sm text-center">
                У вас пока нет сохранённых шаблонов.
                <br />
                Создайте первый при{' '}
                <Link href="/dashboard/import" className="underline underline-offset-2">
                  импорте CSV
                </Link>
                .
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      {editingId === tpl.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 max-w-[200px]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename()
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-income"
                            onClick={submitRename}
                            disabled={renameMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{tpl.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tpl.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEdit(tpl.id, tpl.name)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить шаблон?</AlertDialogTitle>
            <AlertDialogDescription>
              Шаблон будет удалён без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
