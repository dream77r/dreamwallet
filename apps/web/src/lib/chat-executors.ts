import type { ChatBlock } from '@dreamwallet/shared'
import type { PrismaClient } from '@dreamwallet/db'

type Prisma = PrismaClient

async function getWalletAccountIds(prisma: Prisma, userId: string): Promise<string[]> {
  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return []
  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id },
    select: { id: true },
  })
  return accounts.map(a => a.id)
}

export async function executeShowBalance(prisma: Prisma, userId: string): Promise<ChatBlock[]> {
  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return [{ type: 'text', content: 'Кошелёк не найден. Создайте его в настройках.' }]

  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id, isArchived: false },
    select: { name: true, balance: true, currency: true, type: true },
  })

  if (accounts.length === 0) return [{ type: 'text', content: 'У вас пока нет счетов.' }]

  const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  return [{
    type: 'summary',
    title: 'Баланс счетов',
    items: [
      ...accounts.map(a => ({
        label: a.name,
        value: `${Number(a.balance).toLocaleString('ru-RU')} ${a.currency}`,
      })),
      { label: 'Итого', value: `${total.toLocaleString('ru-RU')} ₽` },
    ],
  }]
}

export async function executeShowExpenses(
  prisma: Prisma,
  userId: string,
  params: { period?: string },
): Promise<ChatBlock[]> {
  const accountIds = await getWalletAccountIds(prisma, userId)
  if (accountIds.length === 0) return [{ type: 'text', content: 'Кошелёк не найден.' }]

  const now = new Date()
  let startDate: Date
  const periodText = params.period ?? 'месяц'

  if (/недел/.test(periodText)) {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 7)
  } else if (/сегодн/.test(periodText)) {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (/вчера/.test(periodText)) {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  } else if (/год/.test(periodText)) {
    startDate = new Date(now.getFullYear(), 0, 1)
  } else {
    // default: current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      accountId: { in: accountIds },
      type: 'EXPENSE',
      date: { gte: startDate },
    },
    _sum: { amount: true },
  })

  if (spending.length === 0) return [{ type: 'text', content: `Нет расходов за ${periodText}.` }]

  const catIds = spending.map(s => s.categoryId).filter(Boolean) as string[]
  const categories = await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  })
  const catMap = new Map(categories.map(c => [c.id, c.name]))

  const items = spending
    .map(s => ({
      label: catMap.get(s.categoryId ?? '') ?? 'Без категории',
      value: Number(s._sum.amount ?? 0),
    }))
    .sort((a, b) => b.value - a.value)

  const total = items.reduce((sum, i) => sum + i.value, 0)

  const blocks: ChatBlock[] = [
    {
      type: 'summary',
      title: `Расходы за ${periodText}`,
      items: [
        ...items.map(i => ({
          label: i.label,
          value: `${i.value.toLocaleString('ru-RU')} ₽`,
        })),
        { label: 'Итого', value: `${total.toLocaleString('ru-RU')} ₽` },
      ],
    },
  ]

  if (items.length > 1) {
    blocks.push({
      type: 'chart',
      chartType: 'pie',
      data: items.slice(0, 8).map(i => ({ label: i.label, value: i.value })),
    })
  }

  return blocks
}

export async function executeShowCategorySpend(
  prisma: Prisma,
  userId: string,
  params: { category?: string },
): Promise<ChatBlock[]> {
  if (!params.category) return [{ type: 'text', content: 'Укажите категорию.' }]

  const accountIds = await getWalletAccountIds(prisma, userId)
  if (accountIds.length === 0) return [{ type: 'text', content: 'Кошелёк не найден.' }]

  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true },
  })

  const categoryLower = params.category.toLowerCase()
  const matched = categories.find(c => c.name.toLowerCase().includes(categoryLower))
  if (!matched) return [{ type: 'text', content: `Категория "${params.category}" не найдена.` }]

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const result = await prisma.transaction.aggregate({
    where: {
      accountId: { in: accountIds },
      type: 'EXPENSE',
      categoryId: matched.id,
      date: { gte: monthStart },
    },
    _sum: { amount: true },
    _count: true,
  })

  const amount = Number(result._sum.amount ?? 0)

  return [{
    type: 'summary',
    title: `Расходы на "${matched.name}" за текущий месяц`,
    items: [
      { label: 'Сумма', value: `${amount.toLocaleString('ru-RU')} ₽` },
      { label: 'Операций', value: String(result._count) },
    ],
  }]
}

export async function executeCreateBudget(
  _prisma: Prisma,
  _userId: string,
  params: { amount?: number; category?: string },
): Promise<ChatBlock[]> {
  return [{
    type: 'action',
    label: `Создать бюджет${params.category ? ` "${params.category}"` : ''} на ${params.amount?.toLocaleString('ru-RU') ?? '?'} ₽/мес?`,
    actionType: 'create_budget',
    payload: { amount: params.amount, category: params.category },
  }]
}

export async function executeCreateTransaction(
  prisma: Prisma,
  userId: string,
  params: { amount?: number; type?: string; description?: string },
): Promise<ChatBlock[]> {
  if (!params.amount) return [{ type: 'text', content: 'Не удалось определить сумму.' }]

  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return [{ type: 'text', content: 'Кошелёк не найден.' }]

  const account = await prisma.account.findFirst({
    where: { walletId: wallet.id, isArchived: false },
    orderBy: { createdAt: 'asc' },
  })
  if (!account) return [{ type: 'text', content: 'Нет доступных счетов.' }]

  const txType = (params.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE'
  const balanceDelta = txType === 'INCOME' ? params.amount : -params.amount

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId: account.id,
        type: txType,
        amount: params.amount,
        currency: account.currency,
        date: new Date(),
        description: params.description ?? 'Операция через чат',
        source: 'API',
      },
    }),
    prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: balanceDelta } },
    }),
  ])

  return [{
    type: 'transaction_created',
    amount: params.amount,
    txType,
    description: params.description ?? 'Операция через чат',
  }]
}

export async function executeShowBudgets(prisma: Prisma, userId: string): Promise<ChatBlock[]> {
  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return [{ type: 'text', content: 'Кошелёк не найден.' }]

  const budgets = await prisma.budget.findMany({
    where: { walletId: wallet.id },
    include: { category: { select: { name: true } } },
  })

  if (budgets.length === 0) return [{ type: 'text', content: 'У вас пока нет бюджетов.' }]

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const accountIds = (
    await prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
  ).map(a => a.id)

  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      accountId: { in: accountIds },
      type: 'EXPENSE',
      date: { gte: monthStart },
      categoryId: { in: budgets.map(b => b.categoryId) },
    },
    _sum: { amount: true },
  })
  const spendMap = new Map(spending.map(s => [s.categoryId, Number(s._sum.amount ?? 0)]))

  return [{
    type: 'summary',
    title: 'Бюджеты',
    items: budgets.map(b => {
      const spent = spendMap.get(b.categoryId) ?? 0
      const limit = Number(b.amount)
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
      const trend = pct > 90 ? 'up' as const : pct > 60 ? 'stable' as const : 'down' as const
      return {
        label: b.category.name,
        value: `${spent.toLocaleString('ru-RU')} / ${limit.toLocaleString('ru-RU')} ₽ (${pct}%)`,
        trend,
      }
    }),
  }]
}

export async function executeShowLast(prisma: Prisma, userId: string): Promise<ChatBlock[]> {
  const accountIds = await getWalletAccountIds(prisma, userId)
  if (accountIds.length === 0) return [{ type: 'text', content: 'Кошелёк не найден.' }]

  const transactions = await prisma.transaction.findMany({
    where: { accountId: { in: accountIds } },
    orderBy: { date: 'desc' },
    take: 7,
    include: { category: { select: { name: true } } },
  })

  if (transactions.length === 0) return [{ type: 'text', content: 'Транзакций пока нет.' }]

  return [{
    type: 'summary',
    title: 'Последние операции',
    items: transactions.map(t => ({
      label: `${t.date.toISOString().split('T')[0]} · ${t.category?.name ?? 'Без категории'}`,
      value: `${t.type === 'INCOME' ? '+' : '-'}${Number(t.amount).toLocaleString('ru-RU')} ${t.currency}`,
      trend: t.type === 'INCOME' ? 'down' as const : 'up' as const,
    })),
  }]
}

export async function executeShowGoals(prisma: Prisma, userId: string): Promise<ChatBlock[]> {
  const goals = await prisma.goal.findMany({
    where: { userId, isCompleted: false },
  })

  if (goals.length === 0) return [{ type: 'text', content: 'У вас нет активных целей.' }]

  return [{
    type: 'summary',
    title: 'Цели',
    items: goals.map(g => {
      const current = Number(g.currentAmount)
      const target = Number(g.targetAmount)
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      return {
        label: g.name,
        value: `${current.toLocaleString('ru-RU')} / ${target.toLocaleString('ru-RU')} ₽ (${pct}%)`,
        trend: pct >= 100 ? 'up' as const : pct > 50 ? 'stable' as const : 'down' as const,
      }
    }),
  }]
}
