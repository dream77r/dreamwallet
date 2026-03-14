'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CheckCircle2, Sparkles, Zap, Building2, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

const planIcons = {
  FREE: Zap,
  PRO: Sparkles,
  BUSINESS: Building2,
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const { data: plans } = trpc.billing.getPlans.useQuery()
  const { data: subscription } = trpc.billing.getSubscription.useQuery()
  const checkoutMutation = trpc.billing.createCheckout.useMutation()

  const currentPlan = subscription?.plan || 'FREE'

  async function handleUpgrade(plan: 'PRO' | 'BUSINESS') {
    setLoading(plan)
    try {
      const result = await checkoutMutation.mutateAsync({
        plan,
        period: yearly ? 'yearly' : 'monthly',
        provider: 'yukassa',
      })
      window.location.href = result.checkoutUrl
    } catch {
      setLoading(null)
    }
  }

  if (!plans) return null

  const planList = [
    { key: 'FREE' as const, ...plans.FREE },
    { key: 'PRO' as const, ...plans.PRO },
    { key: 'BUSINESS' as const, ...plans.BUSINESS },
  ]

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="text-center">
        <h1 className="text-headline">Тарифы</h1>
        <p className="text-muted-foreground mt-2">Выберите подходящий план для ваших финансов</p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm ${!yearly ? 'font-semibold' : 'text-muted-foreground'}`}>Ежемесячно</span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={`text-sm ${yearly ? 'font-semibold' : 'text-muted-foreground'}`}>
            Ежегодно
            <Badge variant="secondary" className="ml-1.5 text-xs">-25%</Badge>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planList.map((plan) => {
          const Icon = planIcons[plan.key]
          const isCurrent = currentPlan === plan.key
          const price = yearly ? plan.priceYearly : plan.priceMonthly
          const isPopular = plan.key === 'PRO'

          return (
            <div
              key={plan.key}
              className={`glass-card card-interactive rounded-2xl relative ${
                isPopular ? 'border-2 border-primary gradient-border-hover shadow-lg' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-hero text-white">Популярный</Badge>
                </div>
              )}
              <div className="text-center pb-2 p-6">
                <div className="flex justify-center mb-2">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isPopular ? 'gradient-hero text-white' : 'bg-muted'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="mt-2">
                  {price === 0 ? (
                    <span className="text-3xl font-bold">Бесплатно</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">{price.toLocaleString('ru-RU')}</span>
                      <span className="text-muted-foreground"> {plan.currency}/{yearly ? 'год' : 'мес'}</span>
                    </div>
                  )}
                  {yearly && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(price / 12).toLocaleString('ru-RU')} {plan.currency}/мес
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-4 px-6 pb-6">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-income mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" className="w-full rounded-xl" disabled>
                    Текущий план
                  </Button>
                ) : plan.key === 'FREE' ? (
                  <Button variant="outline" className="w-full rounded-xl" disabled>
                    Базовый
                  </Button>
                ) : (
                  <Button
                    className={`w-full rounded-xl ${
                      isPopular
                        ? 'gradient-hero text-white hover:opacity-90'
                        : ''
                    }`}
                    variant={isPopular ? undefined : 'outline'}
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={loading !== null}
                  >
                    {loading === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Выбрать {plan.name}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Все цены указаны с учётом НДС. Подписку можно отменить в любой момент.</p>
        <p>Принимаем оплату через ЮKassa (карты РФ) и Stripe (международные карты).</p>
      </div>
    </div>
  )
}
