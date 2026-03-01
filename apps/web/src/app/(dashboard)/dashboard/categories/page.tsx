'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tag, Pencil, Trash2, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

type CategoryType = 'INCOME' | 'EXPENSE'

interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
}

const PRESET_COLORS = [
  '#22C55E', '#3B82F6', '#F97316', '#A855F7', '#EC4899',
  '#EAB308', '#EF4444', '#6366F1', '#14B8A6', '#64748B',
]

const DEFAULT_ICON = '🏷️'
const DEFAULT_COLOR = '#64748B'

// ─── Category Form Dialog ───────────────────────────────────────────────────

interface CategoryFormDialogProps {
  defaultType?: CategoryType
  initialData?: Category
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
}

function CategoryFormDialog({ defaultType = 'EXPENSE', initialData, open, onOpenChange }: CategoryFormDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState(initialData?.name ?? '')
  const [icon, setIcon] = useState(initialData?.icon ?? '')
  const [color, setColor] = useState(initialData?.color ?? DEFAULT_COLOR)
  const [type, setType] = useState<CategoryType>(initialData?.type ?? defaultType)

  const isEdit = !!initialData

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      toast.success('Категория создана')
      utils.category.list.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      toast.success('Категория обновлена')
      utils.category.list.invalidate()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })

  function resetForm() {
    setName('')
    setIcon('')
    setColor(DEFAULT_COLOR)
    setType(defaultType)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (isEdit) {
      updateMutation.mutate({
        id: initialData.id,
        name: name.trim(),
        icon: icon.trim() || undefined,
        color: color || undefined,
      })
    } else {
      createMutation.mutate({
        name: name.trim(),
        type,
        icon: icon.trim() || undefined,
        color: color || undefined,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && !isEdit) resetForm() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Тип — только при создании */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === 'EXPENSE' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setType('EXPENSE')}
                >
                  Расход
                </Button>
                <Button
                  type="button"
                  variant={type === 'INCOME' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setType('INCOME')}
                >
                  Доход
                </Button>
              </div>
            </div>
          )}

          {/* Название */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Название *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Кафе"
              maxLength={50}
              required
            />
          </div>

          {/* Иконка */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">Иконка (emoji)</Label>
            <Input
              id="cat-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🍕"
              maxLength={4}
            />
          </div>

          {/* Цвет */}
          <div className="space-y-1.5">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#000' : 'transparent',
                    outline: color === c ? '2px solid white' : 'none',
                    outlineOffset: '1px',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
            {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Category Card ──────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category
  onEdit: () => void
}

function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const utils = trpc.useUtils()

  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      toast.success('Категория удалена')
      utils.category.list.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Card className="group relative">
      <CardContent className="flex items-center gap-3 p-4">
        {/* Иконка с цветом */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: category.color ?? DEFAULT_COLOR }}
        >
          {category.icon ?? DEFAULT_ICON}
        </div>

        {/* Название */}
        <span className="flex-1 truncate text-sm font-medium">{category.name}</span>

        {/* Кнопки (появляются при hover) */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                <AlertDialogDescription>
                  Транзакции с этой категорией не удалятся, но потеряют привязку к категории.
                  Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteMutation.mutate({ id: category.id })}
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Category List ──────────────────────────────────────────────────────────

interface CategoryListProps {
  categories: Category[]
  type: CategoryType
  isLoading: boolean
  onAdd: () => void
}

function CategoryList({ categories, type, isLoading, onAdd }: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const filtered = categories.filter((c) => c.type === type)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 flex-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed py-16 text-muted-foreground">
        <div className="mb-3 text-4xl">🏷️</div>
        <p className="mb-1 font-medium text-foreground">Нет категорий</p>
        <p className="mb-4 text-sm">Добавьте первую категорию для {type === 'EXPENSE' ? 'расходов' : 'доходов'}</p>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить
        </Button>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onEdit={() => setEditingCategory(cat)}
          />
        ))}

        {/* Карточка-добавить */}
        <Card
          className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:bg-muted/50"
          style={{ minHeight: '64px' }}
          onClick={onAdd}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-dashed">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Добавить</span>
          </div>
        </Card>
      </div>

      {/* Edit dialog */}
      {editingCategory && (
        <CategoryFormDialog
          initialData={editingCategory}
          open={!!editingCategory}
          onOpenChange={(o) => { if (!o) setEditingCategory(null) }}
        />
      )}
    </>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType>('EXPENSE')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: categories = [], isLoading } = trpc.category.list.useQuery()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Категории</h1>
          <p className="text-sm text-muted-foreground">Управляйте категориями доходов и расходов</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить категорию
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryType)}>
        <TabsList>
          <TabsTrigger value="EXPENSE">
            Расходы{' '}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {categories.filter((c) => c.type === 'EXPENSE').length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="INCOME">
            Доходы{' '}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {categories.filter((c) => c.type === 'INCOME').length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="EXPENSE" className="mt-4">
          <CategoryList
            categories={categories}
            type="EXPENSE"
            isLoading={isLoading}
            onAdd={() => setCreateOpen(true)}
          />
        </TabsContent>

        <TabsContent value="INCOME" className="mt-4">
          <CategoryList
            categories={categories}
            type="INCOME"
            isLoading={isLoading}
            onAdd={() => setCreateOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <CategoryFormDialog
        defaultType={activeTab}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}
