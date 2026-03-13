'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

export type SuggestRulePayload = {
  txId: string
  description: string | null
  counterparty: string | null
  categoryId: string
  categoryName: string
  categoryIcon?: string | null
}

interface Props {
  payload: SuggestRulePayload | null
  onClose: () => void
  onApplied: () => void
}

/** Извлекает ключевое слово из описания для паттерна правила */
function extractPattern(description: string | null, counterparty: string | null): string {
  const text = description || counterparty || ''
  // Берём первые значимые слова (до 30 символов), убираем цифры/спецсимволы в начале
  const cleaned = text
    .replace(/^\d[\d\s]*/, '')       // убираем ведущие цифры
    .replace(/\b\d{4,}\b/g, '')      // убираем длинные числа (номера карт, чеков)
    .replace(/\s+/g, ' ')
    .trim()
  // Берём первые 2-3 слова
  const words = cleaned.split(' ').filter(w => w.length > 2).slice(0, 3)
  return words.join(' ').slice(0, 40) || text.slice(0, 40)
}

export function SuggestRuleDialog({ payload, onClose, onApplied }: Props) {
  const [pattern, setPattern] = useState(() => extractPattern(payload?.description ?? null, payload?.counterparty ?? null))
  const [applying, setApplying] = useState(false)

  // Обновляем паттерн при смене payload
  const currentPattern = payload ? (pattern || extractPattern(payload.description, payload.counterparty)) : ''

  const createRule = trpc.autoRules.create.useMutation()
  const applyToExisting = trpc.autoRules.applyRuleToExisting.useMutation()

  if (!payload) return null

  async function handleCreateAndApply() {
    if (!payload || !currentPattern.trim()) return
    setApplying(true)
    try {
      // 1. Создаём правило
      await createRule.mutateAsync({
        categoryId: payload.categoryId,
        pattern: currentPattern.trim(),
        field: 'description',
        isRegex: false,
        priority: 10,
      })

      // 2. Применяем ко всем похожим транзакциям
      const result = await applyToExisting.mutateAsync({
        pattern: currentPattern.trim(),
        field: 'description',
        isRegex: false,
        categoryId: payload.categoryId,
      })

      toast.success(
        result.updated > 0
          ? `Правило создано. Обновлено транзакций: ${result.updated}`
          : 'Правило создано. Похожих транзакций не найдено.'
      )
      onApplied()
      onClose()
    } catch {
      toast.error('Не удалось создать правило')
    } finally {
      setApplying(false)
    }
  }

  function handleSkip() {
    onClose()
  }

  return (
    <Dialog open={!!payload} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Создать авто-правило?
          </DialogTitle>
          <DialogDescription>
            Хочешь, чтобы похожие транзакции автоматически попадали в{' '}
            <strong>{payload.categoryIcon} {payload.categoryName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ключевое слово / паттерн</Label>
            <Input
              value={currentPattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="Например: Пятёрочка"
              className="h-8 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Все транзакции с этим словом в описании → {payload.categoryName}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1"
            size="sm"
            onClick={handleCreateAndApply}
            disabled={applying || !currentPattern.trim()}
          >
            {applying ? 'Применяю...' : 'Создать и применить'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSkip} disabled={applying}>
            Пропустить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
