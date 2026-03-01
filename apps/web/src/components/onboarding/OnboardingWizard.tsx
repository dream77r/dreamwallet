'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'CREDIT_CARD', label: 'Карта' },
  { value: 'SAVINGS', label: 'Накопительный' },
] as const

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<string>('CASH')
  const [creating, setCreating] = useState(false)

  const { data: wallet, isLoading: walletLoading } = trpc.wallet.get.useQuery()
  const walletId = wallet?.id

  const accountsQuery = trpc.account.listAll.useQuery()
  const accounts = accountsQuery.data ?? []

  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => {
      toast.success('Счёт создан!')
      void accountsQuery.refetch()
      setStep(2)
    },
    onError: (err) => {
      toast.error(`Ошибка: ${err.message}`)
    },
  })

  const isOpen = !walletLoading && !accountsQuery.isLoading && accounts.length === 0 && !!walletId && step <= 3

  async function handleCreateAccount() {
    if (!accountName.trim() || !walletId) return
    setCreating(true)
    try {
      await createAccount.mutateAsync({
        walletId,
        name: accountName.trim(),
        type: accountType as 'CASH' | 'CREDIT_CARD' | 'SAVINGS',
        currency: 'RUB',
        initialBalance: 0,
      })
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} showCloseButton={false}>
        <Progress value={(step / 3) * 100} className="h-1.5 mb-2" />
        <p className="text-xs text-muted-foreground text-center">Шаг {step} из 3</p>

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Создайте первый счёт</DialogTitle>
              <DialogDescription>
                Для начала работы добавьте хотя бы один счёт — наличные, карту или накопительный.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="account-name">Название</Label>
                <Input
                  id="account-name"
                  placeholder="Например: Основная карта"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  autoFocus
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
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateAccount} disabled={!accountName.trim() || creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Импортируйте транзакции</DialogTitle>
              <DialogDescription>
                Загрузите CSV-выписку из банка или добавьте транзакции вручную позже.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => router.push('/dashboard/import')}>
                Перейти к импорту
              </Button>
              <Button variant="outline" onClick={() => setStep(3)}>
                Пропустить
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Готово!</DialogTitle>
              <DialogDescription className="text-center">
                Всё настроено. Добро пожаловать в DreamWallet!
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <span className="text-6xl">🎉</span>
              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                Перейти к дашборду
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
