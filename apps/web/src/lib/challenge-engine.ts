import type { PrismaClient } from '@dreamwallet/db/src/generated/prisma'
import { awardPoints } from '@/lib/gamification-engine'

export async function updateChallengeProgress(prisma: PrismaClient, userId: string): Promise<void> {
  const challenges = await prisma.challenge.findMany({
    where: { userId, status: 'ACTIVE' },
  })

  if (challenges.length === 0) return

  const now = new Date()

  // Get user wallet & account IDs (shared across challenge types)
  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  const accountIds = wallet
    ? (await prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })).map(a => a.id)
    : []

  for (const challenge of challenges) {
    let progress = 0
    const config = (challenge.config ?? {}) as Record<string, unknown>

    // Check if challenge expired
    if (now > challenge.endsAt && challenge.status === 'ACTIVE') {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { status: 'FAILED' },
      })
      continue
    }

    switch (challenge.type) {
      case 'no_spend': {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        const expensesToday = await prisma.transaction.count({
          where: {
            accountId: { in: accountIds },
            type: 'EXPENSE',
            date: { gte: todayStart, lte: todayEnd },
          },
        })
        progress = expensesToday === 0 ? 1 : 0
        break
      }

      case 'no_spend_category': {
        const categoryId = config.categoryId as string | undefined
        if (!categoryId) break

        const startDate = new Date(challenge.startsAt)
        startDate.setHours(0, 0, 0, 0)
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)

        const totalDays = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000) + 1
        let qualifyingDays = 0

        for (let d = 0; d < totalDays; d++) {
          const dayStart = new Date(startDate.getTime() + d * 86400000)
          const dayEnd = new Date(dayStart.getTime() + 86400000 - 1)

          const count = await prisma.transaction.count({
            where: {
              accountId: { in: accountIds },
              type: 'EXPENSE',
              categoryId,
              date: { gte: dayStart, lte: dayEnd },
            },
          })
          if (count === 0) qualifyingDays++
        }
        progress = qualifyingDays
        break
      }

      case 'budget_limit': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const budgets = wallet
          ? await prisma.budget.findMany({
              where: { walletId: wallet.id, isActive: true },
            })
          : []

        if (budgets.length === 0) {
          progress = 0
          break
        }

        let allWithinLimit = true
        for (const budget of budgets) {
          const spent = await prisma.transaction.aggregate({
            where: {
              accountId: { in: accountIds },
              type: 'EXPENSE',
              categoryId: budget.categoryId,
              date: { gte: monthStart, lte: now },
            },
            _sum: { amount: true },
          })
          const totalSpent = Number(spent._sum.amount ?? 0)
          if (totalSpent > Number(budget.amount)) {
            allWithinLimit = false
            break
          }
        }

        if (allWithinLimit) {
          const startDate = new Date(challenge.startsAt)
          startDate.setHours(0, 0, 0, 0)
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          progress = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000) + 1
        } else {
          progress = challenge.progress
        }
        break
      }

      case 'savings_target': {
        const periodStart = challenge.startsAt
        const periodEnd = challenge.endsAt ?? now

        const [incomeAgg, expenseAgg] = await Promise.all([
          prisma.transaction.aggregate({
            where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: periodStart, lte: periodEnd } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: periodStart, lte: periodEnd } },
            _sum: { amount: true },
          }),
        ])

        const income = Number(incomeAgg._sum.amount ?? 0)
        const expense = Number(expenseAgg._sum.amount ?? 0)
        progress = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
        break
      }

      case 'streak_keep': {
        const streak = await prisma.userStreak.findUnique({ where: { userId } })
        progress = streak?.currentStreak ?? 0
        break
      }

      default:
        continue
    }

    // Check completion
    if (progress >= challenge.target) {
      const points = typeof config.points === 'number' ? config.points : 50
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { progress, status: 'COMPLETED' },
      })
      await awardPoints(prisma, userId, points)
    } else {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { progress },
      })
    }
  }
}
