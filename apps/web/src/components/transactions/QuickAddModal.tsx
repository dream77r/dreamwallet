'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mic, MicOff, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Parser ────────────────────────────────────────────────────────────────

interface ParsedTransaction {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
}

function parseTransactionText(text: string): ParsedTransaction {
  const lower = text.toLowerCase().trim()

  // Detect income keywords
  const incomeKeywords = ['получил', 'получила', 'пришло', 'пришел', 'доход', 'зарплата', 'заработал', 'заработала', 'начислили', 'перечислили']
  const isIncome = incomeKeywords.some(kw => lower.includes(kw))

  // Extract number
  const numMatch = lower.match(/\d[\d\s.,]*/g)
  const rawNum = numMatch ? numMatch[0].replace(/[\s,]/g, '.').replace(/\.(?=.*\.)/g, '') : '0'
  const amount = parseFloat(rawNum) || 0

  // Remove keywords and number to get description
  let desc = lower
  for (const kw of incomeKeywords) {
    desc = desc.replace(kw, '')
  }
  const expenseKeywords = ['потратил', 'потратила', 'купил', 'купила', 'заплатил', 'заплатила', 'расход', 'на']
  for (const kw of expenseKeywords) {
    desc = desc.replace(new RegExp(`\\b${kw}\\b`, 'g'), '')
  }
  desc = desc.replace(/\d[\d\s.,]*/g, '').replace(/\s+/g, ' ').trim()

  return {
    type: isIncome ? 'INCOME' : 'EXPENSE',
    amount,
    description: desc || (isIncome ? 'Доход' : 'Расход'),
  }
}

// ─── Speech Recognition types ──────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

// ─── Component ─────────────────────────────────────────────────────────────

interface QuickAddModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'input' | 'confirm'

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Confirm form state
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const utils = trpc.useUtils()
  const { data: accounts } = trpc.account.listAll.useQuery(undefined, { enabled: open })
  const { data: categories } = trpc.category.list.useQuery(
    { type },
    { enabled: open && step === 'confirm' }
  )

  const createMutation = trpc.transaction.create.useMutation({
    onSuccess: () => {
      toast.success('Транзакция добавлена')
      onOpenChange(false)
      void utils.transaction.list.invalidate()
      void utils.wallet.get.invalidate()
      void utils.wallet.getStats.invalidate()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('input')
      setText('')
      setIsListening(false)
      recognitionRef.current?.stop()
    }
  }, [open])

  // Set default account
  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  // Check speech API
  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    setSpeechSupported(hasSpeech)
  }, [])

  const startListening = useCallback(() => {
    if (!speechSupported) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as new () => SpeechRecognitionInstance
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'ru-RU'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setText(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [speechSupported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const handleParse = () => {
    if (!text.trim()) return
    const parsed = parseTransactionText(text)
    setType(parsed.type)
    setAmount(parsed.amount > 0 ? String(parsed.amount) : '')
    setDescription(parsed.description)
    setDate(new Date().toISOString().split('T')[0])
    setCategoryId('')
    setStep('confirm')
  }

  const handleSave = () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error('Укажите корректную сумму')
      return
    }
    if (!accountId) {
      toast.error('Выберите счёт')
      return
    }

    createMutation.mutate({
      type,
      accountId,
      amount: numAmount,
      date: new Date(date),
      description: description || undefined,
      categoryId: categoryId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' ? 'Быстрое добавление' : 'Подтверждение'}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Напишите или скажите: <span className="italic">"Потратил 500 на кофе"</span>
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Потратил 500 на кофе..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                autoFocus
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={isListening ? stopListening : startListening}
                disabled={!speechSupported}
                title={!speechSupported ? 'Браузер не поддерживает голосовой ввод' : undefined}
                className={cn(isListening && 'border-red-400 text-red-500')}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Recording indicator */}
            {isListening && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                Запись... Говорите
              </div>
            )}

            {!speechSupported && (
              <p className="text-xs text-muted-foreground">
                Ваш браузер не поддерживает голосовой ввод. Используйте текстовое поле.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={handleParse} disabled={!text.trim()}>
                Далее
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 pt-1">
            {/* Type toggle */}
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('EXPENSE')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    type === 'EXPENSE'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'hover:bg-muted'
                  )}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Расход
                </button>
                <button
                  onClick={() => setType('INCOME')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    type === 'INCOME'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'hover:bg-muted'
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Доход
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-amount">Сумма</Label>
              <Input
                id="qa-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-desc">Описание</Label>
              <Input
                id="qa-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание транзакции"
              />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label>Счёт</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию (опционально)" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-date">Дата</Label>
              <Input
                id="qa-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep('input')}>
                Назад
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
