import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@dreamwallet/db'
import { verifyTgToken } from '@/lib/telegram-jwt'

export async function GET(req: NextRequest) {
  const userId = verifyTgToken(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await prisma.wallet.findFirst({
    where: { userId, type: 'PERSONAL' },
    select: { id: true },
  })

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const budgets = await prisma.budget.findMany({
    where: { walletId: wallet.id, isActive: true },
    include: { category: { select: { name: true, icon: true } } },
  })

  const result = await Promise.all(budgets.map(async (b) => {
    const spent = await prisma.transaction.aggregate({
      where: {
        account: { walletId: wallet.id },
        categoryId: b.categoryId,
        type: 'EXPENSE',
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    })

    const spentAmount = Number(spent._sum.amount ?? 0)
    const limit = Number(b.amount)

    return {
      id: b.id,
      category: b.category.name,
      categoryIcon: b.category.icon,
      limit,
      spent: spentAmount,
      percentage: limit > 0 ? Math.round((spentAmount / limit) * 100) : 0,
    }
  }))

  return NextResponse.json({ budgets: result })
}
