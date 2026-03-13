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
    include: {
      accounts: {
        where: { isArchived: false },
        select: { id: true, name: true, balance: true, currency: true },
      },
    },
  })

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const totalBalance = wallet.accounts.reduce((s, a) => s + Number(a.balance), 0)

  const transactions = await prisma.transaction.findMany({
    where: { account: { wallet: { userId } } },
    include: { category: { select: { name: true, icon: true } } },
    orderBy: { date: 'desc' },
    take: 5,
  })

  return NextResponse.json({
    balance: totalBalance,
    currency: wallet.currency,
    accounts: wallet.accounts.map(a => ({
      id: a.id,
      name: a.name,
      balance: Number(a.balance),
      currency: a.currency,
    })),
    transactions: transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      currency: tx.currency,
      description: tx.description,
      category: tx.category?.name ?? null,
      categoryIcon: tx.category?.icon ?? null,
      date: tx.date.toISOString(),
    })),
  })
}
