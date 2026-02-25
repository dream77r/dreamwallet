import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { PLAN_LIMITS } from '@dreamwallet/shared'

const PLANS = {
  PRO: {
    name: 'Pro',
    priceMonthly: 490,
    priceYearly: 4490,
    currency: 'RUB',
    features: [
      'До 20 счетов',
      '2 банковские интеграции',
      'AI-категоризация',
      'Пользовательские отчёты',
      'Экспорт данных',
      'Бизнес-проекты',
      'История за 3 года',
    ],
  },
  BUSINESS: {
    name: 'Business',
    priceMonthly: 1490,
    priceYearly: 13900,
    currency: 'RUB',
    features: [
      'Безлимитные счета',
      'Безлимитные банковские интеграции',
      'AI-категоризация',
      'Пользовательские отчёты',
      'Экспорт данных',
      'API доступ',
      'Бизнес-проекты без ограничений',
      'Полная история',
    ],
  },
} as const

export const billingRouter = router({
  // Get available plans with prices
  getPlans: publicProcedure.query(() => {
    return {
      FREE: {
        name: 'Бесплатный',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'RUB',
        limits: PLAN_LIMITS.FREE,
        features: [
          'До 3 счетов',
          '6 месяцев истории',
          'Ручной ввод',
          'Базовая аналитика',
        ],
      },
      PRO: {
        ...PLANS.PRO,
        limits: PLAN_LIMITS.PRO,
      },
      BUSINESS: {
        ...PLANS.BUSINESS,
        limits: PLAN_LIMITS.BUSINESS,
      },
    }
  }),

  // Get current subscription status
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return {
        plan: 'FREE' as const,
        status: 'ACTIVE' as const,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      }
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    }
  }),

  // Create checkout session (for upgrading)
  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(['PRO', 'BUSINESS']),
      period: z.enum(['monthly', 'yearly']),
      provider: z.enum(['stripe', 'yukassa']).default('yukassa'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { plan, period, provider } = input

      // Check if already subscribed to this plan
      const existing = await ctx.prisma.subscription.findFirst({
        where: { userId: ctx.user.id, status: 'ACTIVE', plan },
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Already subscribed to this plan',
        })
      }

      const planConfig = PLANS[plan]
      const amount = period === 'monthly' ? planConfig.priceMonthly : planConfig.priceYearly

      if (provider === 'yukassa') {
        return createYukassaPayment({
          userId: ctx.user.id,
          email: ctx.user.email,
          plan,
          period,
          amount,
          currency: 'RUB',
        })
      }

      if (provider === 'stripe') {
        return createStripeCheckout({
          userId: ctx.user.id,
          email: ctx.user.email,
          plan,
          period,
          amount,
          currency: 'RUB',
        })
      }

      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown provider' })
    }),

  // Cancel subscription
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findFirst({
      where: { userId: ctx.user.id, status: 'ACTIVE' },
    })

    if (!subscription || subscription.plan === 'FREE') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No active paid subscription' })
    }

    // Mark as cancelling at period end
    await ctx.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    })

    return { success: true, cancelAt: subscription.currentPeriodEnd }
  }),

  // Resume cancelled subscription
  resume: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findFirst({
      where: { userId: ctx.user.id, status: 'ACTIVE', cancelAtPeriodEnd: true },
    })

    if (!subscription) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription to resume' })
    }

    await ctx.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false },
    })

    return { success: true }
  }),

  // Get billing history
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    // Return audit log entries for billing events
    return ctx.prisma.auditLog.findMany({
      where: {
        userId: ctx.user.id,
        action: { in: ['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELLED', 'PAYMENT_RECEIVED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }),
})

// ── ЮKassa integration ──────────────────────────
async function createYukassaPayment(params: {
  userId: string
  email: string
  plan: string
  period: string
  amount: number
  currency: string
}) {
  const shopId = process.env.YUKASSA_SHOP_ID
  const secretKey = process.env.YUKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    // Development mode — return mock checkout URL
    return {
      checkoutUrl: `/dashboard/settings?payment=mock&plan=${params.plan}`,
      paymentId: `mock_${Date.now()}`,
      provider: 'yukassa' as const,
    }
  }

  const idempotenceKey = `${params.userId}_${params.plan}_${Date.now()}`

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency,
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?payment=success`,
      },
      description: `DreamWallet ${params.plan} (${params.period})`,
      metadata: {
        userId: params.userId,
        plan: params.plan,
        period: params.period,
      },
      receipt: {
        customer: { email: params.email },
        items: [{
          description: `Подписка DreamWallet ${params.plan}`,
          quantity: '1.00',
          amount: {
            value: params.amount.toFixed(2),
            currency: params.currency,
          },
          vat_code: 1,
        }],
      },
    }),
  })

  if (!response.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create payment',
    })
  }

  const payment = await response.json()

  return {
    checkoutUrl: payment.confirmation.confirmation_url,
    paymentId: payment.id,
    provider: 'yukassa' as const,
  }
}

// ── Stripe integration ───────────────────────────
async function createStripeCheckout(params: {
  userId: string
  email: string
  plan: string
  period: string
  amount: number
  currency: string
}) {
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey) {
    return {
      checkoutUrl: `/dashboard/settings?payment=mock&plan=${params.plan}`,
      paymentId: `mock_stripe_${Date.now()}`,
      provider: 'stripe' as const,
    }
  }

  // Dynamic import to avoid loading stripe when not needed
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: params.email,
    line_items: [{
      price_data: {
        currency: params.currency.toLowerCase(),
        product_data: {
          name: `DreamWallet ${params.plan}`,
          description: `Подписка ${params.plan} (${params.period === 'monthly' ? 'ежемесячно' : 'ежегодно'})`,
        },
        unit_amount: params.amount * 100, // in kopecks/cents
        recurring: {
          interval: params.period === 'monthly' ? 'month' : 'year',
        },
      },
      quantity: 1,
    }],
    metadata: {
      userId: params.userId,
      plan: params.plan,
      period: params.period,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?payment=cancelled`,
  })

  return {
    checkoutUrl: session.url!,
    paymentId: session.id,
    provider: 'stripe' as const,
  }
}
