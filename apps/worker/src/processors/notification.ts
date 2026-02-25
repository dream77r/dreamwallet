import type { Job, Processor } from 'bullmq'
import { prisma } from '@dreamwallet/db'

interface NotificationData {
  type: 'budget_check' | 'large_transaction' | 'weekly_digest'
  userId?: string
}

export const notificationProcessor: Processor<NotificationData> = async (job: Job<NotificationData>) => {
  const { type, userId } = job.data

  if (type === 'budget_check' && userId) {
    return await checkBudgets(userId)
  }

  if (type === 'large_transaction') {
    // Handled inline in transaction creation
    return { skipped: true }
  }

  if (type === 'weekly_digest') {
    return await sendWeeklyDigest()
  }

  return { unknown: type }
}

async function checkBudgets(userId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const budgets = await prisma.budget.findMany({
    where: {
      isActive: true,
      wallet: { userId },
    },
    include: {
      category: true,
      wallet: { include: { accounts: { select: { id: true } } } },
    },
  })

  let notifications = 0

  for (const budget of budgets) {
    const accountIds = budget.wallet.accounts.map((a) => a.id)

    const spent = await prisma.transaction.aggregate({
      where: {
        accountId: { in: accountIds },
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: { gte: monthStart },
      },
      _sum: { amount: true },
    })

    const spentAmount = Number(spent._sum.amount || 0)
    const budgetAmount = Number(budget.amount)
    const percentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0

    if (percentage >= 100) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'BUDGET_EXCEEDED',
          title: `Бюджет "${budget.category.name}" превышен!`,
          body: `Потрачено ${spentAmount.toLocaleString('ru')} из ${budgetAmount.toLocaleString('ru')} (${percentage}%)`,
          data: { budgetId: budget.id, categoryId: budget.categoryId },
        },
      })
      notifications++
    } else if (percentage >= budget.alertThreshold) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'BUDGET_WARNING',
          title: `Бюджет "${budget.category.name}" — ${percentage}%`,
          body: `Потрачено ${spentAmount.toLocaleString('ru')} из ${budgetAmount.toLocaleString('ru')}`,
          data: { budgetId: budget.id, categoryId: budget.categoryId },
        },
      })
      notifications++
    }
  }

  return { checked: budgets.length, notifications }
}

async function sendWeeklyDigest() {
  const users = await prisma.user.findMany({
    select: { id: true },
  })

  // TODO: implement weekly email/push digest
  return { users: users.length, sent: 0, message: 'Weekly digest not yet implemented' }
}
