'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface ProjectData {
  id: string
  name: string
  description?: string | null
  currency: string
}

interface ProjectFormProps {
  initialData?: ProjectData
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function ProjectForm({ initialData, open: controlledOpen, onOpenChange, onSuccess }: ProjectFormProps) {
  const isEdit = !!initialData
  const isControlled = controlledOpen !== undefined

  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen

  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [currency, setCurrency] = useState(initialData?.currency ?? 'RUB')

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name)
      setDescription(initialData.description ?? '')
      setCurrency(initialData.currency)
    }
  }, [open, initialData])

  const utils = trpc.useUtils()

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      toast.success('Проект создан')
      setOpen(false)
      resetForm()
      void utils.project.list.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success('Проект обновлён')
      setOpen(false)
      void utils.project.list.invalidate()
      onSuccess?.()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  function resetForm() {
    setName('')
    setDescription('')
    setCurrency('RUB')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Введите название проекта'); return }

    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, name: name.trim(), description: description.trim() || undefined })
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim() || undefined, currency })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const trigger = isEdit ? (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Pencil className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4" />
      Новый проект
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Редактировать проект' : 'Новый проект'}</SheetTitle>
          <SheetDescription>{isEdit ? 'Измените данные проекта' : 'Создайте проект для учёта бизнес-финансов'}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Название проекта</Label>
            <Input
              placeholder="Мой бизнес, Фриланс, ИП..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Описание <span className="text-muted-foreground">(необязательно)</span></Label>
            <Textarea
              placeholder="Краткое описание проекта..."
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>Основная валюта</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUB">RUB — Рубль</SelectItem>
                  <SelectItem value="USD">USD — Доллар</SelectItem>
                  <SelectItem value="EUR">EUR — Евро</SelectItem>
                  <SelectItem value="USDT">USDT — Tether</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
