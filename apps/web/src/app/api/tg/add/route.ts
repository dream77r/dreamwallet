import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@dreamwallet/db'
import { verifyTgToken } from '@/lib/telegram-jwt'

export async function POST(req: NextRequest) {
  const userId = verifyTgToken(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { description, amount, type } = await req.json() as {
    description?: string
    amount?: number
    type?: 'INCOME' | 'EXPENSE'
  }

  if (!description || !amount || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const wallet = await prisma.wallet.findFirst({
    where: { userId, type: 'PERSONAL' },
    include: { accounts: { where: { isArchived: false }, take: 1 } },
  })

  if (!wallet?.accounts[0]) {
    return NextResponse.json({ error: 'No account found' }, { status: 404 })
  }

  const account = wallet.accounts[0]

  // Auto-categorize
  const rules = await prisma.autoCategoryRule.findMany({
    where: { userId, isActive: true },
    orderBy: [{ priority: 'desc' }],
  })

  let categoryId: string | null = null
  for (const rule of rules) {
    const matches = rule.isRegex
      ? new RegExp(rule.pattern, 'i').test(description)
      : description.toLowerCase().includes(rule.pattern.toLowerCase())
    if (matches) {
      categoryId = rule.categoryId
      break
    }
  }

  const multiplier = type === 'INCOME' ? 1 : -1

  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId: account.id,
        type,
        amount,
        currency: account.currency,
        date: new Date(),
        description,
        categoryId: categoryId ?? undefined,
        source: 'MANUAL',
      },
      include: { category: { select: { name: true, icon: true } } },
    }),
    prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: amount * multiplier } },
    }),
  ])

  return NextResponse.json({
    id: tx.id,
    amount: Number(tx.amount),
    type: tx.type,
    description: tx.description,
    category: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
  })
}
