import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const adminRouter = router({
  stats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalUsers,
      totalTransactions,
      totalAccounts,
      subscriptionsByPlan,
      recentUsers,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.transaction.count(),
      ctx.prisma.account.count(),
      ctx.prisma.subscription.groupBy({
        by: ['plan'],
        where: { status: 'ACTIVE' },
        _count: true,
      }),
      ctx.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, email: true, name: true, createdAt: true },
      }),
    ])

    return {
      totalUsers,
      totalTransactions,
      totalAccounts,
      subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
        plan: s.plan,
        count: s._count,
      })),
      recentUsers,
    }
  }),

  listUsers: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, page = 1, limit = 20 } = input ?? {}
      const skip = (page - 1) * limit

      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            subscriptions: {
              where: { status: 'ACTIVE' },
              select: { plan: true },
              take: 1,
            },
            _count: {
              select: {
                auditLogs: true,
              },
            },
          },
        }),
        ctx.prisma.user.count({ where }),
      ])

      // Get transaction counts per user via their wallets
      const userIds = users.map((u) => u.id)
      const transactionCounts = await ctx.prisma.$queryRawUnsafe<
        { user_id: string; count: bigint }[]
      >(
        `SELECT w.user_id, COUNT(t.id)::bigint as count
         FROM wallets w
         JOIN accounts a ON a.wallet_id = w.id
         JOIN transactions t ON t.account_id = a.id
         WHERE w.user_id = ANY($1)
         GROUP BY w.user_id`,
        userIds
      )

      const txCountMap = new Map(
        transactionCounts.map((r) => [r.user_id, Number(r.count)])
      )

      return {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt,
          plan: u.subscriptions[0]?.plan ?? 'FREE',
          transactionCount: txCountMap.get(u.id) ?? 0,
        })),
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  getUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
            select: {
              id: true,
              plan: true,
              status: true,
              currentPeriodEnd: true,
              currentPeriodStart: true,
              cancelAtPeriodEnd: true,
              provider: true,
            },
          },
          personalWallet: {
            include: {
              accounts: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  balance: true,
                  currency: true,
                  isArchived: true,
                },
              },
            },
          },
          _count: {
            select: {
              categories: true,
              projects: true,
              notifications: true,
            },
          },
        },
      })

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Пользователь не найден' })
      }

      // Count transactions
      const txCount = await ctx.prisma.transaction.count({
        where: {
          account: {
            wallet: { userId: user.id },
          },
        },
      })

      return { ...user, transactionCount: txCount }
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(['USER', 'ADMIN']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent removing own admin role
      if (input.id === ctx.user.id && input.role === 'USER') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Нельзя снять роль админа с самого себя',
        })
      }

      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
        select: { id: true, email: true, role: true },
      })
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent self-deletion
      if (input.id === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Нельзя удалить собственный аккаунт через админку',
        })
      }

      // Cascading delete — Prisma handles it via onDelete: Cascade
      await ctx.prisma.user.delete({ where: { id: input.id } })
      return { success: true }
    }),

  updateSubscription: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        plan: z.enum(['FREE', 'PRO', 'BUSINESS']),
        status: z.enum(['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED']),
        currentPeriodEnd: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.prisma.subscription.findFirst({
        where: { userId: input.userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!sub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Подписка пользователя не найдена' })
      }

      return ctx.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          plan: input.plan,
          status: input.status,
          ...(input.currentPeriodEnd
            ? { currentPeriodEnd: new Date(input.currentPeriodEnd) }
            : {}),
        },
        select: {
          id: true,
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      })
    }),
})
