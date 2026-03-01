'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  User,
  Shield,
  Sparkles,
  Save,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

const currencies = [
  { value: 'RUB', label: '₽ Российский рубль' },
  { value: 'USD', label: '$ Доллар США' },
  { value: 'EUR', label: '€ Евро' },
  { value: 'GBP', label: '£ Фунт стерлингов' },
  { value: 'KZT', label: '₸ Казахстанский тенге' },
  { value: 'BYN', label: 'Br Белорусский рубль' },
]

const timezones = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
]

const planLabels: Record<string, string> = {
  FREE: 'Бесплатный',
  PRO: 'Pro',
  BUSINESS: 'Business',
}

// ─── Telegram Section ────────────────────────────────────────────────────────

function TelegramSection() {
  const utils = trpc.useUtils()
  const { data: conn, isLoading } = trpc.telegram.getConnection.useQuery()

  const generateLink = trpc.telegram.generateLinkToken.useMutation({
    onError: (e) => toast.error(e.message),
  })
  const disconnect = trpc.telegram.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Telegram отключён')
      utils.telegram.getConnection.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const [linkData, setLinkData] = useState<{ url: string; expiresInMinutes: number } | null>(null)

  async function handleConnect() {
    const result = await generateLink.mutateAsync()
    setLinkData(result)
    window.open(result.url, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Telegram-бот</CardTitle>
        <CardDescription>Добавляй транзакции текстом или голосом прямо из Telegram</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : conn ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                ✈️
              </div>
              <div>
                <p className="text-sm font-medium">
                  {conn.firstName ?? conn.username ?? 'Telegram'} подключён
                </p>
                <p className="text-xs text-muted-foreground">
                  {conn.username ? `@${conn.username} · ` : ''}{new Date(conn.linkedAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
            >
              Отключить
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Подключи бота и говори что потратил — он сам добавит транзакцию. Даже голосом! 🎙️
            </p>
            <Button onClick={handleConnect} disabled={generateLink.isPending}>
              {generateLink.isPending ? 'Генерируем ссылку...' : '📱 Подключить Telegram'}
            </Button>
            {linkData && (
              <p className="text-xs text-muted-foreground">
                Ссылка действует {linkData.expiresInMinutes} мин. Если страница не открылась —{' '}
                <a href={linkData.url} target="_blank" rel="noreferrer" className="underline">
                  кликни сюда
                </a>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const utils = trpc.useUtils()

  // Fetch real user data
  const { data: user, isLoading: userLoading } = trpc.settings.get.useQuery()
  const { data: subscription, isLoading: subLoading } = trpc.settings.getSubscription.useQuery()

  // Local state synced from server
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Sync local state when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setCurrency(user.currency)
      setTimezone(user.timezone)
    }
  }, [user])

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success('Настройки сохранены')
      void utils.settings.get.invalidate()
    },
    onError: (err) => toast.error(`Ошибка: ${err.message}`),
  })

  function handleSaveProfile() {
    updateMutation.mutate({ name: name.trim() || undefined })
  }

  function handleSavePreferences() {
    updateMutation.mutate({ currency, timezone })
  }

  const plan = subscription?.plan ?? 'FREE'
  const isLoading = userLoading || subLoading

  // Initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="text-muted-foreground text-sm">Управление аккаунтом и предпочтениями</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Профиль</CardTitle>
          </div>
          <CardDescription>Ваши личные данные</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold flex-shrink-0">
              {isLoading ? '?' : initials}
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </>
              ) : (
                <>
                  <p className="font-medium">{user?.name || '—'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Имя</Label>
              {isLoading ? <Skeleton className="h-9 w-full" /> : (
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              {isLoading ? <Skeleton className="h-9 w-full" /> : (
                <Input
                  id="email"
                  value={user?.email ?? ''}
                  disabled
                  className="text-muted-foreground"
                />
              )}
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={updateMutation.isPending || isLoading}>
            {updateMutation.isPending ? (
              <><Save className="h-4 w-4" /> Сохранение...</>
            ) : (
              <><Save className="h-4 w-4" /> Сохранить</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Региональные настройки</CardTitle>
          </div>
          <CardDescription>Валюта и часовой пояс</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Основная валюта</Label>
            {isLoading ? <Skeleton className="h-9 w-full" /> : (
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Часовой пояс
              </div>
            </Label>
            {isLoading ? <Skeleton className="h-9 w-full" /> : (
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button onClick={handleSavePreferences} variant="outline" disabled={updateMutation.isPending || isLoading}>
            <Save className="h-4 w-4" />
            Сохранить настройки
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Безопасность</CardTitle>
          </div>
          <CardDescription>Управление паролем и доступом</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Lock className="h-4 w-4" />
            Изменить пароль
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Shield className="h-4 w-4" />
            Двухфакторная аутентификация
            <Badge variant="secondary" className="ml-auto">Не настроена</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Подписка</CardTitle>
          </div>
          <CardDescription>Ваш текущий тариф</CardDescription>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{planLabels[plan] ?? plan} тариф</p>
                    <Badge variant={plan === 'FREE' ? 'secondary' : 'default'}>{plan}</Badge>
                  </div>
                  {plan === 'FREE' && (
                    <p className="text-sm text-muted-foreground">До 3 счетов · 1 проект · Ручной ввод + CSV</p>
                  )}
                </div>
                {plan === 'FREE' && (
                  <Button size="sm">
                    <Sparkles className="h-4 w-4" />
                    Улучшить
                  </Button>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Счета</span>
                  <span>{plan === 'FREE' ? 'До 3' : plan === 'PRO' ? 'До 20' : 'Без ограничений'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Проекты</span>
                  <span>{plan === 'FREE' ? '1 проект' : 'Без ограничений'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CSV-импорт</span>
                  <span>✅ Включён</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Банковские интеграции</span>
                  <span>{plan === 'FREE' ? '—' : plan === 'PRO' ? '2 банка' : 'Без ограничений'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">История транзакций</span>
                  <span>{plan === 'FREE' ? '6 месяцев' : plan === 'PRO' ? '3 года' : 'Без ограничений'}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Telegram */}
      <TelegramSection />

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base text-red-600">Опасная зона</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Удалить аккаунт</p>
              <p className="text-xs text-muted-foreground">Все данные будут безвозвратно удалены</p>
            </div>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Удаление аккаунта</DialogTitle>
                  <DialogDescription>
                    Это действие необратимо. Все транзакции, счета, бюджеты и проекты будут удалены навсегда.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Label className="text-sm">
                    Введите <span className="font-mono font-semibold">удалить</span> для подтверждения
                  </Label>
                  <Input
                    className="mt-2"
                    placeholder="удалить"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
                  <Button variant="destructive" disabled={deleteConfirmText !== 'удалить'}>
                    Удалить аккаунт навсегда
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
