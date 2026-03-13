import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { CHALLENGE_TEMPLATES, ACHIEVEMENT_DEFINITIONS, LEVEL_THRESHOLDS, checkAchievements } from '@/lib/gamification-engine'

export const gamificationRouter = router({
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const streak = await ctx.prisma.userStreak.findUnique({
      where: { userId: ctx.user.id },
    })

    const achievements = await ctx.prisma.achievement.findMany({
      where: { userId: ctx.user.id },
      orderBy: { earnedAt: 'desc' },
    })

    const activeChallenges = await ctx.prisma.challenge.findMany({
      where: { userId: ctx.user.id, status: 'ACTIVE' },
    })

    return {
      streak: streak ?? { currentStreak: 0, longestStreak: 0, totalPoints: 0, level: 1 },
      achievements,
      activeChallenges,
      levelThresholds: LEVEL_THRESHOLDS,
    }
  }),

  listChallenges: protectedProcedure.query(async ({ ctx }) => {
    const active = await ctx.prisma.challenge.findMany({
      where: { userId: ctx.user.id, status: 'ACTIVE' },
    })
    const completed = await ctx.prisma.challenge.findMany({
      where: { userId: ctx.user.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return { active, completed, templates: CHALLENGE_TEMPLATES }
  }),

  startChallenge: protectedProcedure
    .input(z.object({
      templateIndex: z.number().int().min(0).max(CHALLENGE_TEMPLATES.length - 1),
      config: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const template = CHALLENGE_TEMPLATES[input.templateIndex]

      // Check if user already has this challenge active
      const existing = await ctx.prisma.challenge.findFirst({
        where: { userId: ctx.user.id, type: template.type, status: 'ACTIVE' },
      })
      if (existing) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Челлендж уже активен' })

      const now = new Date()
      const endsAt = new Date(now)
      endsAt.setDate(endsAt.getDate() + template.durationDays)

      return ctx.prisma.challenge.create({
        data: {
          userId: ctx.user.id,
          type: template.type,
          title: template.title,
          target: template.target,
          config: (input.config ?? {}) as any,
          startsAt: now,
          endsAt,
        },
      })
    }),

  cancelChallenge: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.challenge.updateMany({
        where: { id: input.id, userId: ctx.user.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      })
    }),

  listAchievements: protectedProcedure.query(async ({ ctx }) => {
    const earned = await ctx.prisma.achievement.findMany({
      where: { userId: ctx.user.id },
    })
    const earnedTypes = new Set(earned.map(a => a.type))

    return ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      earned: earnedTypes.has(def.type),
      earnedAt: earned.find(a => a.type === def.type)?.earnedAt ?? null,
    }))
  }),

  checkNow: protectedProcedure.mutation(async ({ ctx }) => {
    const newAchievements = await checkAchievements(ctx.prisma, ctx.user.id)
    return { newAchievements }
  }),
})
