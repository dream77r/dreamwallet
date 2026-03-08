import type { PrismaClient } from '@dreamwallet/db'
import { sendTelegramMessage, formatAmount } from '@/lib/telegram-notify'

/**
 * In-memory throttle: не отправляем один и тот же алёрт чаще 1 раза в день.
 * Ключ: `userId:budgetId:threshold` (80 или 100)
 */
const alertThrottleCache = new Map<string, number>()

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function shouldSendAlert(key: string): boolean {
  const last = alertThrottleCache.get(key)
  if (last && Date.now() - last < ONE_DAY_MS) return false
  alertThrottleCache.set(key, Date.now())
  return true
}

export async function checkBudgetAlerts(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
): Promise<void> {
  const tgConn = await prisma.telegramConnection.findUnique({
    where: { userId, isActive: true },
  })
  if (!tgConn?.notifyBudgets) return

  // Найти кошелёк через accountId
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { walletId: true },
  })
  if (!account) return

  const now = new Date()
  const budgets = await prisma.budget.findMany({
    where: { walletId: account.walletId, isActive: true },
    include: { category: true },
  })

  const walletAccounts = await prisma.account.findMany({
    where: { walletId: account.walletId },
    select: { id: true },
  })

  for (const budget of budgets) {
    let periodStart: Date
    if (budget.period === 'MONTHLY') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (budget.period === 'WEEKLY') {
      const day = now.getDay() || 7
      periodStart = new Date(now)
      periodStart.setDate(now.getDate() - day + 1)
      periodStart.setHours(0, 0, 0, 0)
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1)
    }

    const spent = await prisma.transaction.aggregate({
      where: {
        accountId: { in: walletAccounts.map(a => a.id) },
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: { gte: periodStart },
      },
      _sum: { amount: true },
    })

    const spentAmount = Number(spent._sum.amount ?? 0)
    const budgetAmount = Number(budget.amount)
    if (budgetAmount <= 0) continue

    const pct = Math.round((spentAmount / budgetAmount) * 100)
    const categoryName = budget.category.name
    const currency = 'RUB'

    if (pct >= 100) {
      const key = `${userId}:${budget.id}:100`
      if (shouldSendAlert(key)) {
        const msg = `🔴 <b>Бюджет «${categoryName}»</b> превышен! Потрачено ${formatAmount(spentAmount, currency)} / ${formatAmount(budgetAmount, currency)}`
        await sendTelegramMessage(tgConn.chatId, msg)
      }
    } else if (pct >= 80) {
      const key = `${userId}:${budget.id}:80`
      if (shouldSendAlert(key)) {
        const msg = `⚠️ <b>Бюджет «${categoryName}»</b>: использовано ${pct}% (${formatAmount(spentAmount, currency)} / ${formatAmount(budgetAmount, currency)})`
        await sendTelegramMessage(tgConn.chatId, msg)
      }
    }
  }
}
