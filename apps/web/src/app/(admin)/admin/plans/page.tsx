'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Sparkles, Eye, EyeOff, Infinity as InfinityIcon } from 'lucide-react'

type PlanFormValues = {
  plan: 'FREE' | 'PRO' | 'BUSINESS' | 'CUSTOM'
  displayName: string
  priceMonthly: number
  priceYearly: number
  maxAccounts: number
  maxProjects: number
  maxBankConnections: number
  maxProjectMembers: number
  transactionHistoryMonths: number
  hasAiCategorization: boolean
  hasCustomReports: boolean
  hasExport: boolean
  hasApiAccess: boolean
  isVisible: boolean
}

const planColors: Record<string, string> = {
  FREE: 'bg-slate-100 border-slate-200',
  PRO: 'bg-blue-50 border-blue-200',
  BUSINESS: 'bg-purple-50 border-purple-200',
  CUSTOM: 'bg-amber-50 border-amber-200',
}

const planBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  FREE: 'outline',
  PRO: 'default',
  BUSINESS: 'secondary',
  CUSTOM: 'outline',
}

/** -1 отображается как "∞", ввод "∞" или пустое поле → -1 */
function LimitInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const isUnlimited = value === -1
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={-1}
          value={isUnlimited ? '' : value}
          placeholder={isUnlimited ? '∞' : ''}
          disabled={isUnlimited}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            onChange(isNaN(v) ? 0 : v)
          }}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant={isUnlimited ? 'default' : 'outline'}
          size="icon"
          className="h-8 w-8 shrink-0"
          title={isUnlimited ? 'Снять безлимит' : 'Безлимит'}
          onClick={() => onChange(isUnlimited ? 0 : -1)}
        >
          <InfinityIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function PlanCard({ config }: { config: PlanFormValues }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState<PlanFormValues>({ ...config })

  const update = trpc.admin.updatePlanConfig.useMutation({
    onSuccess: () => {
      toast.success(`Тариф «${form.displayName}» сохранён`)
      void utils.admin.getPlanConfigs.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  // Trailing comma required in .tsx to prevent generic from being parsed as JSX
  const set = <K extends keyof PlanFormValues,>(key: K, value: PlanFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Card className={`border-2 ${planColors[config.plan]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{config.plan}</CardTitle>
            <Badge variant={planBadgeVariants[config.plan]}>{config.displayName}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {config.plan === 'CUSTOM' ? (
              <Badge variant="outline" className="text-amber-600 border-amber-400">
                <EyeOff className="h-3 w-3 mr-1" />
                Только в админке
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-600 border-green-400">
                <Eye className="h-3 w-3 mr-1" />
                На лендинге
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {config.plan === 'CUSTOM'
            ? 'Назначается вручную из профиля пользователя, не отображается на лендинге'
            : `${config.priceMonthly === 0 ? 'Бесплатно' : `${config.priceMonthly} ₽/мес`}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Название</Label>
          <Input
            value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Prices */}
        {config.plan !== 'CUSTOM' && config.plan !== 'FREE' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">₽/месяц</Label>
              <Input
                type="number"
                min={0}
                value={form.priceMonthly}
                onChange={(e) => set('priceMonthly', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">₽/год</Label>
              <Input
                type="number"
                min={0}
                value={form.priceYearly}
                onChange={(e) => set('priceYearly', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Limits */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">ЛИМИТЫ (-1 = безлимит)</p>
          <div className="grid grid-cols-2 gap-3">
            <LimitInput label="Счета" value={form.maxAccounts} onChange={(v) => set('maxAccounts', v)} />
            <LimitInput label="Проекты" value={form.maxProjects} onChange={(v) => set('maxProjects', v)} />
            <LimitInput label="Банк. интеграции" value={form.maxBankConnections} onChange={(v) => set('maxBankConnections', v)} />
            <LimitInput label="Участники проекта" value={form.maxProjectMembers} onChange={(v) => set('maxProjectMembers', v)} />
            <LimitInput label="История (месяцев)" value={form.transactionHistoryMonths} onChange={(v) => set('transactionHistoryMonths', v)} />
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">ФУНКЦИИ</p>
          <div className="space-y-2.5">
            {(
              [
                ['hasAiCategorization', 'AI-категоризация'],
                ['hasCustomReports', 'Пользовательские отчёты'],
                ['hasExport', 'Экспорт данных'],
                ['hasApiAccess', 'API доступ'],
              ] as [keyof PlanFormValues, string][]
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer" htmlFor={`${config.plan}-${key}`}>
                  {label}
                </Label>
                <Switch
                  id={`${config.plan}-${key}`}
                  checked={form[key] as boolean}
                  onCheckedChange={(v) => set(key, v)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <Button
          className="w-full"
          onClick={() => update.mutate(form)}
          disabled={update.isPending}
        >
          {update.isPending ? 'Сохранение...' : 'Сохранить тариф'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function AdminPlansPage() {
  const { data, isLoading } = trpc.admin.getPlanConfigs.useQuery()
  // Explicit cast to avoid implicit-any in map callback (Next.js build strictness)
  const configs = data as PlanFormValues[] | undefined

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Тарифы</h1>
          <p className="text-sm text-muted-foreground">Настройка лимитов и цен</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-96 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Тарифы</h1>
        <p className="text-sm text-muted-foreground">
          Настройка лимитов, цен и функций для каждого плана. CUSTOM назначается вручную из профиля пользователя.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(configs ?? []).map((config) => (
          <PlanCard key={config.plan} config={config} />
        ))}
      </div>
    </div>
  )
}
