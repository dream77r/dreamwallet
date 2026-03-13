import type { PrismaClient } from '@dreamwallet/db/src/generated/prisma'

export const ACHIEVEMENT_DEFINITIONS = [
  { type: 'first_tx', title: 'Первая транзакция', icon: '🎉', check: (stats: UserStats) => stats.totalTx >= 1 },
  { type: 'tx_10', title: '10 транзакций', icon: '📊', check: (stats: UserStats) => stats.totalTx >= 10 },
  { type: 'tx_100', title: '100 транзакций', icon: '💯', check: (stats: UserStats) => stats.totalTx >= 100 },
  { type: 'tx_500', title: '500 транзакций', icon: '🏆', check: (stats: UserStats) => stats.totalTx >= 500 },
  { type: 'budget_master', title: 'Мастер бюджета', icon: '🎯', check: (stats: UserStats) => stats.budgetsInLimit >= 3 },
  { type: 'streak_7', title: '7 дней подряд', icon: '🔥', check: (stats: UserStats) => stats.currentStreak >= 7 },
  { type: 'streak_30', title: '30 дней подряд', icon: '⚡', check: (stats: UserStats) => stats.currentStreak >= 30 },
  { type: 'goal_reached', title: 'Цель достигнута', icon: '🏅', check: (stats: UserStats) => stats.goalsCompleted >= 1 },
  { type: 'saver', title: 'Экономист', icon: '💰', check: (stats: UserStats) => stats.savingsRate > 20 },
  { type: 'categorizer', title: 'Всё по полочкам', icon: '📁', check: (stats: UserStats) => stats.categorizedRate > 90 },
] as const

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]

export const CHALLENGE_TEMPLATES = [
  { type: 'no_spend', title: 'День без трат', target: 1, durationDays: 1, points: 10 },
  { type: 'no_spend_category', title: 'Неделя без кафе', target: 7, durationDays: 7, points: 50 },
  { type: 'budget_limit', title: 'В рамках бюджета', target: 30, durationDays: 30, points: 100 },
  { type: 'savings_target', title: 'Копилка 10%', target: 10, durationDays: 30, points: 75 },
  { type: 'streak_keep', title: 'Ежедневный учёт', target: 14, durationDays: 14, points: 70 },
] as const

interface UserStats {
  totalTx: number
  currentStreak: number
  budgetsInLimit: number
  goalsCompleted: number
  savingsRate: number
  categorizedRate: number
}

export function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export async function updateStreak(prisma: PrismaClient, userId: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const streak = await prisma.userStreak.upsert({
    where: { userId },
    create: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today, totalPoints: 5 },
    update: {},
  })

  if (!streak.lastActiveDate) {
    await prisma.userStreak.update({
      where: { userId },
      data: { currentStreak: 1, lastActiveDate: today, totalPoints: { increment: 5 } },
    })
    return
  }

  const lastActive = new Date(streak.lastActiveDate)
  lastActive.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (86400000))

  if (diffDays === 0) return // Already counted today
  if (diffDays === 1) {
    const newStreak = streak.currentStreak + 1
    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak.longestStreak),
        lastActiveDate: today,
        totalPoints: { increment: 5 + (newStreak >= 7 ? 5 : 0) },
        level: calculateLevel(streak.totalPoints + 5),
      },
    })
  } else {
    // Streak broken
    await prisma.userStreak.update({
      where: { userId },
      data: { currentStreak: 1, lastActiveDate: today, totalPoints: { increment: 5 } },
    })
  }
}

export async function checkAchievements(prisma: PrismaClient, userId: string): Promise<string[]> {
  const earned: string[] = []

  // Get existing achievements
  const existing = await prisma.achievement.findMany({
    where: { userId },
    select: { type: true },
  })
  const existingTypes = new Set(existing.map(a => a.type))

  // Gather stats
  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  const accountIds = wallet
    ? (await prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })).map(a => a.id)
    : []

  const totalTx = await prisma.transaction.count({
    where: { accountId: { in: accountIds } },
  })

  const streak = await prisma.userStreak.findUnique({ where: { userId } })
  const currentStreak = streak?.currentStreak ?? 0

  const goalsCompleted = await prisma.goal.count({
    where: { userId, isCompleted: true },
  })

  // Simple budget check
  const budgetsInLimit = 0 // TODO: calculate properly

  // Categorization rate
  const totalTxForCat = await prisma.transaction.count({ where: { accountId: { in: accountIds } } })
  const categorizedTx = await prisma.transaction.count({ where: { accountId: { in: accountIds }, categoryId: { not: null } } })
  const categorizedRate = totalTxForCat > 0 ? (categorizedTx / totalTxForCat) * 100 : 0

  const stats: UserStats = {
    totalTx,
    currentStreak,
    budgetsInLimit,
    goalsCompleted,
    savingsRate: 0,
    categorizedRate,
  }

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (existingTypes.has(def.type)) continue
    if (def.check(stats)) {
      await prisma.achievement.create({
        data: { userId, type: def.type, title: def.title, icon: def.icon },
      })
      // Award points
      await prisma.userStreak.upsert({
        where: { userId },
        create: { userId, totalPoints: 25, level: 1 },
        update: { totalPoints: { increment: 25 } },
      })
      // Notify user about new achievement
      await prisma.notification.create({
        data: { userId, type: 'SYSTEM', title: `${def.icon} ${def.title}`, body: `Вы получили достижение "${def.title}"!` },
      }).catch(() => {}) // non-critical
      earned.push(def.type)
    }
  }

  return earned
}

export async function awardPoints(prisma: PrismaClient, userId: string, points: number): Promise<void> {
  const streak = await prisma.userStreak.upsert({
    where: { userId },
    create: { userId, totalPoints: points, level: calculateLevel(points) },
    update: { totalPoints: { increment: points } },
  })
  const newLevel = calculateLevel(streak.totalPoints + points)
  if (newLevel !== streak.level) {
    await prisma.userStreak.update({
      where: { userId },
      data: { level: newLevel },
    })
  }
}
