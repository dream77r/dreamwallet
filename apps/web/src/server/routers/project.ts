import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { createProjectSchema, updateProjectSchema } from '@dreamwallet/shared'
import { PLAN_LIMITS } from '@dreamwallet/shared'

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: {
        OR: [
          { ownerId: ctx.user.id },
          { members: { some: { userId: ctx.user.id } } },
        ],
      },
      include: {
        wallet: {
          include: {
            accounts: {
              where: { isArchived: false },
              select: { balance: true },
            },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        include: {
          wallet: { include: { accounts: true, budgets: { include: { category: true } } } },
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
          owner: { select: { id: true, name: true, email: true } },
        },
      })

      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })
      return project
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Check plan limits
      const sub = await ctx.prisma.subscription.findFirst({
        where: { userId: ctx.user.id, status: 'ACTIVE' },
      })
      const plan = sub?.plan || 'FREE'
      const limits = PLAN_LIMITS[plan]

      if (limits.maxProjects !== -1) {
        const count = await ctx.prisma.project.count({ where: { ownerId: ctx.user.id } })
        if (count >= limits.maxProjects) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Лимит проектов (${limits.maxProjects}) исчерпан. Обновите тариф.`,
          })
        }
      }

      return ctx.prisma.project.create({
        data: {
          ...input,
          ownerId: ctx.user.id,
          wallet: {
            create: {
              name: `${input.name} — кошелёк`,
              type: 'PROJECT',
              currency: input.currency,
            },
          },
          members: {
            create: {
              userId: ctx.user.id,
              role: 'OWNER',
              joinedAt: new Date(),
            },
          },
        },
        include: { wallet: true },
      })
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const project = await ctx.prisma.project.findFirst({
        where: { id, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN' })

      return ctx.prisma.project.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.project.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // Get project dashboard
  getDashboard: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        include: { wallet: { include: { accounts: { select: { id: true } } } } },
      })
      if (!project?.wallet) throw new TRPCError({ code: 'NOT_FOUND' })

      const now = new Date()
      const from = input.dateFrom || new Date(now.getFullYear(), now.getMonth(), 1)
      const to = input.dateTo || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      const accountIds = project.wallet.accounts.map(a => a.id)

      const [revenue, expenses] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      ])

      const rev = Number(revenue._sum.amount || 0)
      const exp = Number(expenses._sum.amount || 0)

      return {
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
        profitMargin: rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0,
      }
    }),

  // Invite member
  invite: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      email: z.string().email(),
      role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).default('VIEWER'),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN' })

      const user = await ctx.prisma.user.findUnique({ where: { email: input.email } })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Пользователь не найден' })

      return ctx.prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: input.projectId, userId: user.id } },
        update: { role: input.role },
        create: {
          projectId: input.projectId,
          userId: user.id,
          role: input.role,
        },
      })
    }),

  // Remove member
  removeMember: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      userId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.projectMember.delete({
        where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
      })
      return { success: true }
    }),
})
