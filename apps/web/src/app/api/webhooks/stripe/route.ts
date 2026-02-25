import { NextRequest, NextResponse } from 'next/server'
import { prisma, type SubscriptionPlan } from '@dreamwallet/db'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, plan, period } = session.metadata || {}

        if (!userId || !plan) break

        const now = new Date()
        const periodEnd = new Date(now)
        if (period === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }

        await prisma.subscription.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'CANCELLED' },
        })

        await prisma.subscription.create({
          data: {
            userId,
            plan: plan as SubscriptionPlan,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            externalId: session.subscription as string,
            provider: 'STRIPE',
          },
        })

        await prisma.auditLog.create({
          data: {
            userId,
            action: 'SUBSCRIPTION_CREATED',
            entity: 'Subscription',
            entityId: session.id,
            changes: { plan, period },
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const stripeSubId = subscription.id

        // Find and deactivate
        const sub = await prisma.subscription.findFirst({
          where: { externalId: stripeSubId, status: 'ACTIVE' },
        })

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELLED' },
          })

          // Create FREE subscription
          await prisma.subscription.create({
            data: { userId: sub.userId, plan: 'FREE', status: 'ACTIVE' },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription?: string | { id: string } | null }
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id

        if (!subId) break

        const sub = await prisma.subscription.findFirst({
          where: { externalId: subId },
        })

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE' },
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 },
    )
  }
}
