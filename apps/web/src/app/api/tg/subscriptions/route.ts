import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@dreamwallet/db'
import { verifyTgToken } from '@/lib/telegram-jwt'
import { SUBSCRIPTION_CATALOG, normalizeToMonthly } from '@dreamwallet/shared'

export async function GET(req: NextRequest) {
  const userId = verifyTgToken(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rules = await prisma.recurringRule.findMany({
    where: {
      isActive: true,
      type: 'EXPENSE',
      transactions: {
        some: { account: { wallet: { userId } } },
      },
    },
    orderBy: { nextRunAt: 'asc' },
  })

  const subscriptions = rules.map(r => {
    const n = r.name.toLowerCase()
    const catalogMatch = SUBSCRIPTION_CATALOG.find(
      s => n.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(n),
    )

    return {
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      schedule: r.schedule,
      monthlyAmount: normalizeToMonthly(Number(r.amount), r.schedule),
      nextRunAt: r.nextRunAt.toISOString(),
      icon: catalogMatch?.icon ?? '💳',
      category: catalogMatch?.categoryKey ?? 'other',
    }
  })

  const totalMonthly = subscriptions.reduce((s, r) => s + r.monthlyAmount, 0)

  return NextResponse.json({ subscriptions, totalMonthly })
}
