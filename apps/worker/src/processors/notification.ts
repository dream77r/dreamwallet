import type { Job, Processor } from 'bullmq'
import { prisma } from '@dreamwallet/db'
import webpush from 'web-push'

interface NotificationData {
  type: 'budget_check' | 'large_transaction' | 'weekly_digest'
  userId?: string
  transactionId?: string
  amount?: number
  description?: string
}

// Configure VAPID once
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:support@dreamwallet.app', VAPID_PUBLIC, VAPID_PRIVATE)
}

async function pushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const data = JSON.stringify({ ...payload, icon: '/icon-192.png' })
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data)
        .catch(async (e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => null)
          }
        })
    )
  )
}

export const notificationProcessor: Processor<NotificationData> = async (job: Job<NotificationData>) => {
  const { type, userId } = job.data

  if (type === 'budget_check' && userId) {
    return await checkBudgets(userId)
  }

  if (type === 'large_transaction' && userId) {
    const { amount = 0, description = 'Транзакция' } = job.data
    const amountStr = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount)
    await prisma.notification.create({
      data: {
        userId,
        type: 'LARGE_TRANSACTION',
        title: `Крупный расход: ${amountStr}`,
        body: description,
        data: { amount, transactionId: job.data.transactionId },
      },
    })
    await pushToUser(userId, {
      title: `💸 Крупный расход`,
      body: `${description}: ${amountStr}`,
      url: '/dashboard/transactions',
    })
    return { sent: true }
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
      const title = `Бюджет "${budget.category.name}" превышен!`
      const body = `Потрачено ${spentAmount.toLocaleString('ru')} из ${budgetAmount.toLocaleString('ru')} (${percentage}%)`
      await prisma.notification.create({
        data: { userId, type: 'BUDGET_EXCEEDED', title, body, data: { budgetId: budget.id } },
      })
      await pushToUser(userId, { title: `🔴 ${title}`, body, url: '/dashboard/budgets' })
      notifications++
    } else if (percentage >= budget.alertThreshold) {
      const title = `Бюджет "${budget.category.name}" — ${percentage}%`
      const body = `Потрачено ${spentAmount.toLocaleString('ru')} из ${budgetAmount.toLocaleString('ru')}`
      await prisma.notification.create({
        data: { userId, type: 'BUDGET_WARNING', title, body, data: { budgetId: budget.id } },
      })
      await pushToUser(userId, { title: `🟡 ${title}`, body, url: '/dashboard/budgets' })
      notifications++
    }
  }

  return { checked: budgets.length, notifications }
}

async function sendWeeklyDigest() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true, name: true },
  })

  let sent = 0
  for (const user of users) {
    const wallet = await prisma.wallet.findFirst({ where: { userId: user.id } })
    if (!wallet) continue

    const accounts = await prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
    const accountIds = accounts.map(a => a.id)

    const stats = await prisma.transaction.aggregate({
      where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: weekAgo } },
      _sum: { amount: true },
      _count: true,
    })

    const topCategory = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: weekAgo }, categoryId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    })

    let categoryName = ''
    if (topCategory[0]?.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: topCategory[0].categoryId }, select: { name: true } })
      categoryName = cat?.name ?? ''
    }

    const totalSpent = Number(stats._sum.amount || 0)
    const txCount = stats._count

    if (txCount === 0) continue

    const amountStr = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(totalSpent)

    await pushToUser(user.id, {
      title: '📊 Дайджест за неделю',
      body: `Расходы: ${amountStr} (${txCount} транзакций)${categoryName ? `. Топ: ${categoryName}` : ''}`,
      url: '/dashboard/analytics',
    })
    sent++
  }

  return { users: users.length, sent }
}
