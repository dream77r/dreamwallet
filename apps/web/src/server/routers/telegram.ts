import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { randomBytes } from 'crypto'

// In-memory store (в продакшне — Redis с TTL)
// Экспортируем чтобы API route мог проверять токены
export const pendingLinks = new Map<string, { userId: string; expiresAt: number }>()

export const telegramRouter = router({
  /** Статус подключения Telegram */
  getConnection: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.telegramConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { chatId: true, username: true, firstName: true, linkedAt: true, isActive: true },
    })
  }),

  /** Генерирует ссылку для привязки. Пользователь кликает → попадает в бот → /start <token> */
  generateLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = randomBytes(16).toString('hex')
    pendingLinks.set(token, {
      userId:    ctx.user.id,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 минут
    })
    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'dreamwallet_bot'
    return {
      token,
      url:              `https://t.me/${botUsername}?start=${token}`,
      expiresInMinutes: 15,
    }
  }),

  /** Отключить Telegram */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.telegramConnection.deleteMany({
      where: { userId: ctx.user.id },
    })
    return { success: true }
  }),

  /** Получить настройки алёртов */
  getAlertSettings: protectedProcedure.query(async ({ ctx }) => {
    const conn = await ctx.prisma.telegramConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { notifyTransactions: true, notifyBudgets: true, notifyGoals: true, isActive: true },
    })
    if (!conn) return null
    return conn
  }),

  /** Обновить настройки алёртов */
  updateAlertSettings: protectedProcedure
    .input(z.object({
      notifyTransactions: z.boolean().optional(),
      notifyBudgets:      z.boolean().optional(),
      notifyGoals:        z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await ctx.prisma.telegramConnection.findUnique({
        where: { userId: ctx.user.id },
      })
      if (!conn) return { success: false, message: 'Telegram не подключён' }

      await ctx.prisma.telegramConnection.update({
        where: { userId: ctx.user.id },
        data: input,
      })
      return { success: true }
    }),
})
