'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  Wallet,
  CheckCircle2,
  ArrowRight,
  Upload,
  Plus,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

type Step = 1 | 2 | 3

const ACCOUNT_TYPES = [
  { value: 'BANK_ACCOUNT', label: '🏦 Банковская карта' },
  { value: 'CASH', label: '💵 Наличные' },
  { value: 'SAVINGS', label: '🐖 Накопительный' },
  { value: 'CREDIT_CARD', label: '💳 Кредитный' },
  { value: 'INVESTMENT', label: '📈 Инвестиционный' },
]

const CURRENCIES = [
  { value: 'RUB', label: '₽ Рубль' },
  { value: 'USD', label: '$ Доллар' },
  { value: 'EUR', label: '€ Евро' },
]

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              s < step
                ? 'bg-primary text-primary-foreground'
                : s === step
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < 3 && (
            <div className={`h-px w-8 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  // Step 2 form state
  const [accountName, setAccountName] = useState('Основная карта')
  const [accountType, setAccountType] = useState('BANK_ACCOUNT')
  const [balance, setBalance] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [createdAccountName, setCreatedAccountName] = useState('')

  const { data: wallet } = trpc.wallet.get.useQuery()

  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => {
      setCreatedAccountName(accountName)
      setStep(3)
    },
    onError: (err) => {
      toast.error('Не удалось создать счёт: ' + err.message)
    },
  })

  async function handleCreateAccount() {
    if (!accountName.trim()) return toast.error('Введите название счёта')
    if (!wallet?.id) return toast.error('Кошелёк не найден')

    await createAccount.mutateAsync({
      walletId: wallet.id,
      name: accountName.trim(),
      type: accountType as never,
      currency,
      initialBalance: parseFloat(balance) || 0,
    })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <StepIndicator step={step} />

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <Card className="text-center shadow-lg">
            <CardHeader className="pb-4 pt-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Wallet className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Добро пожаловать в DreamWallet! 👋</CardTitle>
              <CardDescription className="text-base mt-2">
                Настроим ваш кошелёк за 2 минуты.<br />
                Начнём с создания первого счёта.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center py-4">
                <div className="space-y-1">
                  <div className="text-2xl">📊</div>
                  <p className="text-xs text-muted-foreground">Аналитика расходов</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">🎯</div>
                  <p className="text-xs text-muted-foreground">Финансовые цели</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">🤖</div>
                  <p className="text-xs text-muted-foreground">AI-инсайты</p>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                Начать настройку <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Create account */}
        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Создайте первый счёт</CardTitle>
              <CardDescription>Это может быть банковская карта или наличные</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название счёта</Label>
                <Input
                  id="name"
                  placeholder="Например: Тинькофф, Наличные..."
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Тип счёта</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="balance">Текущий баланс</Label>
                  <Input
                    id="balance"
                    type="number"
                    placeholder="0"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
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
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Назад
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateAccount}
                  disabled={createAccount.isPending || !accountName.trim()}
                >
                  {createAccount.isPending ? 'Создаём...' : 'Создать счёт'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <Card className="text-center shadow-lg">
            <CardHeader className="pb-4 pt-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Готово! 🎉</CardTitle>
              <CardDescription className="text-base mt-2">
                Счёт <strong>«{createdAccountName}»</strong> создан.<br />
                Что делаем дальше?
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8 space-y-3">
              <Button
                className="w-full"
                onClick={() => router.push('/dashboard/transactions')}
              >
                <Plus className="mr-2 h-4 w-4" /> Добавить первую транзакцию
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard/import')}
              >
                <Upload className="mr-2 h-4 w-4" /> Импортировать выписку
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard/goals')}
              >
                <TrendingUp className="mr-2 h-4 w-4" /> Поставить финансовую цель
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => router.push('/dashboard')}
              >
                <Sparkles className="mr-2 h-4 w-4" /> На дашборд
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
