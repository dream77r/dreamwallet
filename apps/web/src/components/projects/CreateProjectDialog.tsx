'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

const ICON_OPTIONS = ['💰', '🏠', '🚗', '✈️', '📱', '💼', '🎯', '🏋️', '🌿', '🎨']

const CURRENCIES = [
  { value: 'RUB', label: 'RUB — Рубль' },
  { value: 'USD', label: 'USD — Доллар' },
  { value: 'EUR', label: 'EUR — Евро' },
  { value: 'KZT', label: 'KZT — Тенге' },
]

interface CreateProjectDialogProps {
  trigger?: React.ReactNode
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [icon, setIcon] = useState('💼')

  const utils = trpc.useUtils()
  const createMutation = trpc.project.create.useMutation({
    onSuccess: (project) => {
      void utils.project.list.invalidate()
      setOpen(false)
      resetForm()
      router.push(`/projects/${project.id}`)
    },
  })

  function resetForm() {
    setName('')
    setDescription('')
    setCurrency('RUB')
    setIcon('💼')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      currency,
      icon,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать пространство
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новое пространство</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Иконка</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIcon(opt)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition-colors ${
                    icon === opt
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-name">Название *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Моё пространство"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc">Описание</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательное описание"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Валюта</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
