'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Tag, Hash } from 'lucide-react'
import { toast } from 'sonner'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#78716c',
]

interface TagFormValues {
  name: string
  color: string
}

export default function TagsPage() {
  const [open, setOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<TagFormValues>({ name: '', color: '#6366f1' })

  const { data: tags, refetch } = trpc.tags.list.useQuery()

  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => { toast.success('Тег создан'); setOpen(false); setForm({ name: '', color: '#6366f1' }); refetch() },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => { toast.success('Тег обновлён'); setEditingTag(null); refetch() },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => { toast.success('Тег удалён'); setDeleteId(null); refetch() },
    onError: (e) => toast.error(e.message),
  })

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Введите название тега')
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, name: form.name, color: form.color })
    } else {
      createMutation.mutate({ name: form.name, color: form.color })
    }
  }

  const openEdit = (tag: { id: string; name: string; color: string }) => {
    setEditingTag(tag)
    setForm({ name: tag.name, color: tag.color })
    setOpen(true)
  }

  const openCreate = () => {
    setEditingTag(null)
    setForm({ name: '', color: '#6366f1' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Теги</h1>
          <p className="text-muted-foreground">Управление тегами для транзакций</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingTag(null) }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Создать тег
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Редактировать тег' : 'Новый тег'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Preview */}
              <div className="flex justify-center py-2">
                <Badge
                  style={{ backgroundColor: form.color + '20', color: form.color, borderColor: form.color + '40' }}
                  className="text-sm px-3 py-1 border"
                >
                  <Hash className="mr-1 h-3 w-3" />
                  {form.name || 'Предпросмотр'}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input
                  placeholder="например: кофе, транспорт..."
                  value={form.name}
                  maxLength={32}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Цвет</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="h-7 w-7 rounded-full transition-all hover:scale-110 focus:outline-none"
                      style={{
                        backgroundColor: c,
                        outline: form.color === c ? `3px solid ${c}` : `2px solid transparent`,
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                    className="h-7 w-7 rounded-full cursor-pointer border border-border overflow-hidden p-0"
                    title="Выбрать произвольный цвет"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingTag ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags grid */}
      {!tags?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">Нет тегов</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Создайте теги для группировки транзакций
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Создать первый тег
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tags.map((tag) => (
            <Card
              key={tag.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => openEdit(tag)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: tag.color }}
                  >
                    <Hash className="h-5 w-5" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(tag.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="font-medium text-sm truncate">{tag.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tag._count.transactions} {tag._count.transactions === 1 ? 'транзакция' : 'транзакций'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {tags && tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Статистика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold text-lg">{tags.length}</span>
                <p className="text-muted-foreground">тегов создано</p>
              </div>
              <div>
                <span className="font-semibold text-lg">
                  {tags.reduce((sum, t) => sum + t._count.transactions, 0)}
                </span>
                <p className="text-muted-foreground">транзакций помечено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тег?</AlertDialogTitle>
            <AlertDialogDescription>
              Тег будет удалён со всех транзакций. Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
