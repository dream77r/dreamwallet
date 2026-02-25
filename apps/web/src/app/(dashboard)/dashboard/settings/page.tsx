'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
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
  Bell,
  Shield,
  CreditCard,
  Trash2,
  Save,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

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

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('Александр Иванов')
  const [email] = useState('alexander@example.com')
  const [currency, setCurrency] = useState('RUB')
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    weeklyDigest: true,
    largeTransactions: true,
    monthlyReport: false,
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="text-muted-foreground text-sm">Управление аккаунтом и предпочтениями</p>
      </div>

      {/* Profile section */}
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
              АИ
            </div>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              Сменить фото
            </Button>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="text-muted-foreground"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saved}>
            {saved ? (
              <><CheckCircle2 className="h-4 w-4" /> Сохранено</>
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
          <CardDescription>Валюта, часовой пояс и формат дат</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Основная валюта</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Часовой пояс
              </div>
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} variant="outline">
            <Save className="h-4 w-4" />
            Сохранить настройки
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Уведомления</CardTitle>
          </div>
          <CardDescription>Настройте, о чём хотите получать уведомления</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'budgetAlerts', label: 'Превышение бюджета', description: 'Когда расходы превышают установленный лимит' },
            { key: 'weeklyDigest', label: 'Еженедельный дайджест', description: 'Краткий отчёт о финансах каждое воскресенье' },
            { key: 'largeTransactions', label: 'Крупные транзакции', description: 'Уведомления о транзакциях свыше 10 000 ₽' },
            { key: 'monthlyReport', label: 'Ежемесячный отчёт', description: 'Подробный отчёт в начале каждого месяца' },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={notifications[key as keyof typeof notifications]}
                onCheckedChange={(checked) =>
                  setNotifications(prev => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Безопасность</CardTitle>
          </div>
          <CardDescription>Управление паролем и сессиями</CardDescription>
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
          <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            Активные сессии
            <Badge className="ml-auto">1</Badge>
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">Бесплатный тариф</p>
                <Badge variant="secondary">Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground">До 3 счетов, до 100 транзакций в месяц</p>
            </div>
            <Button>
              <Sparkles className="h-4 w-4" />
              Улучшить
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Счета</span>
              <span>2 / 3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Транзакции в феврале</span>
              <span>47 / 100</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Проекты</span>
              <span className="text-muted-foreground">Только Pro</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Импорт CSV</span>
              <span className="text-muted-foreground">Только Pro</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base text-red-600">Опасная зона</CardTitle>
          </div>
          <CardDescription>Необратимые действия с аккаунтом</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Экспортировать данные</p>
              <p className="text-xs text-muted-foreground">Скачать все данные в формате CSV</p>
            </div>
            <Button variant="outline" size="sm">Экспорт</Button>
          </div>

          <Separator />

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
                    Это действие необратимо. Все ваши данные — транзакции, счета, бюджеты, проекты — будут удалены безвозвратно.
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
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmText !== 'удалить'}
                  >
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
