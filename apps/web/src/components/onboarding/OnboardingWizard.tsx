'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Loader2, Wallet, Tags, PiggyBank, FileUp, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, icon: Wallet,      title: 'Счёт',       desc: 'Добавьте первый счёт' },
  { id: 2, icon: Tags,        title: 'Категории',   desc: 'Настройте категории' },
  { id: 3, icon: PiggyBank,   title: 'Бюджет',      desc: 'Задайте бюджет' },
  { id: 4, icon: FileUp,      title: 'Импорт',      desc: 'Загрузите выписку' },
  { id: 5, icon: CheckCircle2,title: 'Готово',      desc: 'Всё настроено!' },
]

const DEFAULT_CATEGORIES = [
  { name: 'Продукты',          icon: '🛒', type: 'EXPENSE' },
  { name: 'Транспорт',         icon: '🚌', type: 'EXPENSE' },
  { name: 'Кафе и рестораны',  icon: '☕', type: 'EXPENSE' },
  { name: 'Здоровье',          icon: '💊', type: 'EXPENSE' },
  { name: 'Развлечения',       icon: '🎬', type: 'EXPENSE' },
  { name: 'Покупки',           icon: '🛍️', type: 'EXPENSE' },
  { name: 'ЖКХ',              icon: '🏠', type: 'EXPENSE' },
  { name: 'Связь',             icon: '📱', type: 'EXPENSE' },
  { name: 'Зарплата',          icon: '💰', type: 'INCOME'  },
  { name: 'Фриланс',           icon: '💻', type: 'INCOME'  },
]

const ACCOUNT_TYPES = [
  { value: 'BANK_ACCOUNT', label: '🏦 Банковский счёт' },
  { value: 'CREDIT_CARD',  label: '💳 Карта' },
  { value: 'CASH',         label: '💵 Наличные' },
  { value: 'SAVINGS',      label: '🐷 Накопительный' },
]

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 - Account
  const [accountName, setAccountName] = useState('Основная карта')
  const [accountType, setAccountType] = useState('BANK_ACCOUNT')
  const [balance, setBalance] = useState('')

  // Step 2 - Categories
  const [selectedCats, setSelectedCats] = useState<string[]>(
    DEFAULT_CATEGORIES.map(c => c.name)
  )

  // Step 3 - Budget
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetName, setBudgetName] = useState('Ежемесячные расходы')

  const utils = trpc.useUtils()
  const { data: wallet, isLoading: walletLoading } = trpc.wallet.get.useQuery()
  const { data: accountsData, isLoading: accountsLoading } = trpc.account.listAll.useQuery()
  const { data: userData } = trpc.settings.get.useQuery()

  const createAccount = trpc.account.create.useMutation()
  const createCategory = trpc.category.create.useMutation()
  const createBudget = trpc.budget.create.useMutation()
  const completeOnboarding = trpc.settings.completeOnboarding.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  })

  const isOpen = !walletLoading && !accountsLoading &&
    (!(userData as any)?.onboardingDone) &&
    (accountsData?.length === 0 || step > 1) &&
    !!wallet?.id

  if (!isOpen) return null

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  async function handleStep1() {
    if (!accountName.trim() || !wallet?.id) return
    setLoading(true)
    try {
      await createAccount.mutateAsync({
        walletId: wallet.id,
        name: accountName.trim(),
        type: accountType as any,
        currency: 'RUB',
        initialBalance: parseFloat(balance) || 0,
      })
      toast.success('Счёт создан!')
      setStep(2)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2() {
    if (!wallet?.id) return
    setLoading(true)
    try {
      const cats = DEFAULT_CATEGORIES.filter(c => selectedCats.includes(c.name))
      for (const cat of cats) {
        await createCategory.mutateAsync({
          name: cat.name,
          icon: cat.icon,
          type: cat.type as 'INCOME' | 'EXPENSE',
        }).catch(() => {}) // ignore duplicates
      }
      toast.success('Категории добавлены!')
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep3() {
    if (budgetAmount && parseFloat(budgetAmount) > 0) {
      setLoading(true)
      try {
        await createBudget.mutateAsync({
          walletId: wallet!.id,
          amount: parseFloat(budgetAmount),
          period: 'MONTHLY',
          alertThreshold: 80,
        })
        toast.success('Бюджет создан!')
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    setStep(4)
  }

  async function handleFinish() {
    await completeOnboarding.mutateAsync()
    router.push('/dashboard')
  }

  const currentStep = STEPS[step - 1]
  const StepIcon = currentStep.icon

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg p-0 overflow-hidden gap-0"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-medium">Шаг {step} из {STEPS.length}</p>
              <h2 className="font-bold text-lg leading-tight">{currentStep.title}</h2>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-2">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  s.id <= step ? 'bg-white' : 'bg-white/30',
                  s.id === step ? 'flex-1' : 'w-6'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1 — Account */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Добавьте основной счёт, с которого начнёте отслеживание.</p>
              <div className="space-y-2">
                <Label>Название счёта</Label>
                <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Основная карта" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Текущий баланс <span className="text-muted-foreground">(необязательно)</span></Label>
                <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" />
              </div>
              <Button className="w-full bg-indigo-500 hover:bg-indigo-600" onClick={handleStep1} disabled={!accountName.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Далее <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2 — Categories */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Выберите категории расходов и доходов. Можно изменить позже.</p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {DEFAULT_CATEGORIES.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCats(prev =>
                      prev.includes(cat.name) ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                    )}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border transition-all text-left',
                      selectedCats.includes(cat.name)
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'border-border bg-card text-muted-foreground hover:border-indigo-300'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                </Button>
                <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600" onClick={handleStep2} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Далее <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Budget */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Задайте ежемесячный бюджет на расходы — это поможет контролировать траты.</p>
              <div className="space-y-2">
                <Label>Сумма бюджета в месяц, ₽</Label>
                <Input type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="50000" autoFocus />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                </Button>
                <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600" onClick={handleStep3} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {budgetAmount ? 'Создать' : 'Пропустить'} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Import */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Загрузите CSV-выписку из банка, чтобы сразу увидеть статистику.</p>
              <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center space-y-2">
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Поддерживаются Сбер, Альфа, Тинькофф и другие</p>
                <p className="text-xs text-muted-foreground">CSV или XLSX формат</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                </Button>
                <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600" onClick={() => { router.push('/dashboard/import'); completeOnboarding.mutateAsync() }}>
                  Перейти к импорту
                </Button>
              </div>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(5)}>
                Пропустить
              </Button>
            </div>
          )}

          {/* Step 5 — Done */}
          {step === 5 && (
            <div className="text-center space-y-4 py-2">
              <div className="text-6xl">🎉</div>
              <div>
                <h3 className="text-lg font-bold">Всё готово!</h3>
                <p className="text-sm text-muted-foreground mt-1">DreamWallet настроен и готов к работе. Удачи с финансами!</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                {[
                  { icon: '💳', label: 'Счёт создан' },
                  { icon: '🏷️', label: 'Категории' },
                  { icon: '📊', label: 'Дашборд' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-xs font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full bg-indigo-500 hover:bg-indigo-600 mt-2" onClick={handleFinish} disabled={completeOnboarding.isPending}>
                {completeOnboarding.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Начать работу 🚀
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
