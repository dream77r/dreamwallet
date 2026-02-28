'use client'

import { useState } from 'react'
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
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface ProjectFormProps {
  onSuccess?: () => void
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('RUB')

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

  function resetForm() {
    setName('')
    setDescription('')
    setCurrency('RUB')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Введите название проекта'); return }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      currency,
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Новый проект
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Новый проект</SheetTitle>
          <SheetDescription>Создайте проект для учёта бизнес-финансов</SheetDescription>
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Основная валюта</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RUB">RUB — Рубль</SelectItem>
                <SelectItem value="USD">USD — Доллар</SelectItem>
                <SelectItem value="EUR">EUR — Евро</SelectItem>
                <SelectItem value="USDT">USDT — Tether</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
