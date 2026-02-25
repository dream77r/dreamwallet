import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@dreamwallet/db'

// ЮKassa webhook: payment.succeeded, payment.canceled, refund.succeeded
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, object: payment } = body

    if (!payment?.metadata?.userId || !payment?.metadata?.plan) {
      return NextResponse.json({ ok: true }) // Ignore events without our metadata
    }

    const { userId, plan, period } = payment.metadata

    switch (event) {
      case 'payment.succeeded': {
        // Calculate period end
        const now = new Date()
        const periodEnd = new Date(now)
        if (period === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }

        // Deactivate old subscriptions
        await prisma.subscription.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'CANCELLED' },
        })

        // Create new subscription
        await prisma.subscription.create({
          data: {
            userId,
            plan,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            externalId: payment.id,
            provider: 'YUKASSA',
          },
        })

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'SUBSCRIPTION_CREATED',
            entity: 'Subscription',
            entityId: payment.id,
            changes: { plan, period, amount: payment.amount?.value },
          },
        })

        break
      }

      case 'payment.canceled': {
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'PAYMENT_FAILED',
            entity: 'Subscription',
            entityId: payment.id,
            changes: { plan, reason: payment.cancellation_details?.reason },
          },
        })
        break
      }

      case 'refund.succeeded': {
        // Downgrade to FREE
        await prisma.subscription.updateMany({
          where: { userId, status: 'ACTIVE', plan: { not: 'FREE' } },
          data: { status: 'CANCELLED' },
        })

        await prisma.subscription.create({
          data: { userId, plan: 'FREE', status: 'ACTIVE' },
        })
        break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('YuKassa webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
