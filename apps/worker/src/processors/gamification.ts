import type { Processor } from 'bullmq'
import pino from 'pino'
import { prisma } from '@dreamwallet/db'

const logger = pino({ name: 'gamification' })

export const gamificationProcessor: Processor = async () => {
  logger.info('Running daily gamification checks...')

  try {
    // Check active challenges
    const activeChallenges = await prisma.challenge.findMany({
      where: { status: 'ACTIVE' },
    })

    const now = new Date()

    for (const challenge of activeChallenges) {
      // Check if challenge expired
      if (challenge.endsAt < now) {
        const status = challenge.progress >= challenge.target ? 'COMPLETED' : 'FAILED'
        await prisma.challenge.update({
          where: { id: challenge.id },
          data: { status },
        })

        if (status === 'COMPLETED') {
          // Award points
          await prisma.userStreak.upsert({
            where: { userId: challenge.userId },
            create: { userId: challenge.userId, totalPoints: 50 },
            update: { totalPoints: { increment: 50 } },
          })
        }

        logger.info({ challengeId: challenge.id, status }, 'Challenge resolved')
      }
    }

    // Check streak-at-risk: users who logged yesterday but not today
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const atRiskStreaks = await prisma.userStreak.findMany({
      where: {
        currentStreak: { gte: 3 },
        lastActiveDate: yesterday,
      },
      include: { user: { select: { id: true } } },
    })

    for (const streak of atRiskStreaks) {
      // Create notification
      await prisma.notification.create({
        data: {
          userId: streak.userId,
          type: 'SYSTEM',
          title: '🔥 Стрик под угрозой!',
          body: `Твой стрик ${streak.currentStreak} дней может прерваться. Добавь транзакцию сегодня!`,
        },
      })
    }

    logger.info({
      challengesResolved: activeChallenges.length,
      atRiskStreaks: atRiskStreaks.length,
    }, 'Gamification checks complete')

  } catch (err) {
    logger.error(err, 'Gamification processor failed')
    throw err
  }
}
