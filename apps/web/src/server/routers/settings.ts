import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { updateSettingsSchema } from '@dreamwallet/shared'

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        currency: true,
        timezone: true,
        locale: true,
        onboardingDone: true,
        userProfile: true,
        createdAt: true,
      },
    })
  }),

  update: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      })
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.subscription.findFirst({
      where: { userId: ctx.user.id, status: 'ACTIVE' },
    })
  }),

  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }),

  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true },
      })
      return { success: true }
    }),

  markAllNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.notification.updateMany({
      where: { userId: ctx.user.id, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, name: true, email: true },
    })
  }),

  // ── Onboarding ──────────────────────────────────────────────

  setUserProfile: protectedProcedure
    .input(z.object({ profile: z.enum(['beginner', 'experienced', 'business']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { userProfile: input.profile },
      })
      return { success: true }
    }),

  getOnboardingProgress: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id

    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId } })
    const walletId = wallet?.id

    const [accountCount, txCount, budgetCount, goalCount, importedTxCount, telegramConn] =
      await Promise.all([
        walletId
          ? ctx.prisma.account.count({ where: { walletId } })
          : Promise.resolve(0),
        walletId
          ? ctx.prisma.transaction.count({
              where: { account: { walletId } },
              take: 1,
            })
          : Promise.resolve(0),
        walletId
          ? ctx.prisma.budget.count({ where: { walletId } })
          : Promise.resolve(0),
        ctx.prisma.goal.count({ where: { userId } }),
        walletId
          ? ctx.prisma.transaction.count({
              where: { account: { walletId }, source: 'CSV_IMPORT' },
              take: 1,
            })
          : Promise.resolve(0),
        ctx.prisma.telegramConnection.findFirst({
          where: { userId },
          select: { id: true },
        }),
      ])

    const tasks = [
      { id: 'account',     label: 'Создать счёт',           icon: '💳', done: accountCount > 0,       required: true },
      { id: 'transaction', label: 'Добавить транзакцию',    icon: '➕', done: txCount > 0,            required: true },
      { id: 'telegram',    label: 'Подключить Telegram',    icon: '🤖', done: !!telegramConn,         required: false },
      { id: 'import',      label: 'Импортировать выписку',  icon: '📥', done: importedTxCount > 0,    required: false },
      { id: 'budget',      label: 'Задать бюджет',          icon: '📊', done: budgetCount > 0,        required: false },
      { id: 'goal',        label: 'Поставить цель',         icon: '🎯', done: goalCount > 0,          required: false },
    ]

    const completed = tasks.filter(t => t.done).length

    return { tasks, completed, total: tasks.length }
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { onboardingDone: true },
    })
    return { success: true }
  }),
})
