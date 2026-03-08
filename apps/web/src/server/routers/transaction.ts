import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { createTransactionSchema, updateTransactionSchema, transactionFiltersSchema } from '@dreamwallet/shared'
import { sendTelegramMessage, formatAmount } from '@/lib/telegram-notify'
import { checkBudgetAlerts } from './budget-alerts'

export const transactionRouter = router({
  // List transactions with filters and pagination
  list: protectedProcedure
    .input(transactionFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder, search, tags, ...filters } = input

      // Build where clause
      const where: Record<string, unknown> = {}

      if (filters.accountId) where.accountId = filters.accountId
      if (filters.type) where.type = filters.type
      if (filters.categoryId) where.categoryId = filters.categoryId
      if (filters.source) where.source = filters.source

      if (filters.dateFrom || filters.dateTo) {
        where.date = {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        }
      }

      if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
        where.amount = {
          ...(filters.amountMin !== undefined && { gte: filters.amountMin }),
          ...(filters.amountMax !== undefined && { lte: filters.amountMax }),
        }
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { counterparty: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (tags && tags.length > 0) {
        where.tags = { some: { tag: { name: { in: tags } } } }
      }

      // Ensure user can only see their own transactions
      if (filters.walletId) {
        const wallet = await ctx.prisma.wallet.findFirst({
          where: {
            id: filters.walletId,
            OR: [
              { userId: ctx.user.id },
              { project: { members: { some: { userId: ctx.user.id } } } },
            ],
          },
          include: { accounts: { select: { id: true } } },
        })
        if (!wallet) throw new TRPCError({ code: 'NOT_FOUND' })
        where.accountId = { in: wallet.accounts.map(a => a.id) }
      } else if (!filters.accountId) {
        // Default: show personal wallet transactions
        const personalWallet = await ctx.prisma.wallet.findUnique({
          where: { userId: ctx.user.id },
          include: { accounts: { select: { id: true } } },
        })
        if (personalWallet) {
          where.accountId = { in: personalWallet.accounts.map(a => a.id) }
        }
      }

      const [items, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where: where as never,
          include: {
            category: true,
            account: { select: { id: true, name: true, type: true, icon: true } },
            tags: { include: { tag: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.prisma.transaction.count({ where: where as never }),
      ])

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    }),

  // Get single transaction
  get: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          account: true,
          tags: { include: { tag: true } },
          attachments: true,
        },
      })

      if (!transaction) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Транзакция не найдена' })
      }

      return transaction
    }),

  // Create transaction
  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...data } = input

      // ── Авто-категоризация: применяем правила если категория не задана ──
      let resolvedCategoryId = data.categoryId
      if (!resolvedCategoryId && (data.description || data.counterparty)) {
        const rules = await ctx.prisma.autoCategoryRule.findMany({
          where:   { userId: ctx.user.id, isActive: true },
          orderBy: [{ priority: 'desc' }],
        })
        for (const rule of rules) {
          const text = rule.field === 'counterparty'
            ? (data.counterparty ?? '')
            : (data.description ?? '')
          const matches = rule.isRegex
            ? new RegExp(rule.pattern, 'i').test(text)
            : text.toLowerCase().includes(rule.pattern.toLowerCase())
          if (matches) {
            resolvedCategoryId = rule.categoryId
            break
          }
        }
      }

      const transaction = await ctx.prisma.$transaction(async (tx) => {
        // Create transaction
        const created = await tx.transaction.create({
          data: {
            ...data,
            categoryId: resolvedCategoryId,
            amount: data.amount,
            source: 'MANUAL',
          },
        })

        // Update account balance
        const multiplier = data.type === 'INCOME' ? 1 : data.type === 'EXPENSE' ? -1 : 0
        if (multiplier !== 0) {
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { increment: data.amount * multiplier } },
          })
        }

        // Handle transfer
        if (data.type === 'TRANSFER' && data.transferToAccountId) {
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { decrement: data.amount } },
          })
          await tx.account.update({
            where: { id: data.transferToAccountId },
            data: { balance: { increment: data.amount } },
          })
        }

        // Add tags (upsert by userId+name, then link to transaction)
        if (tags?.length) {
          for (const tagName of tags) {
            const tag = await tx.tag.upsert({
              where: { userId_name: { userId: ctx.user.id, name: tagName } },
              update: {},
              create: { userId: ctx.user.id, name: tagName },
            })
            await tx.tagOnTransaction.create({
              data: { transactionId: created.id, tagId: tag.id },
            })
          }
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            userId: ctx.user.id,
            action: 'create',
            entity: 'transaction',
            entityId: created.id,
            changes: data as never,
          },
        })

        return created
      })

      // Telegram уведомление о транзакции (fire-and-forget)
      void (async () => {
        try {
          const tgConn = await ctx.prisma.telegramConnection.findUnique({
            where: { userId: ctx.user.id, isActive: true },
          })
          if (tgConn?.notifyTransactions) {
            const category = transaction.categoryId
              ? await ctx.prisma.category.findUnique({ where: { id: transaction.categoryId } })
              : null
            const amount = formatAmount(Number(transaction.amount), transaction.currency)
            let msg: string
            if (transaction.type === 'EXPENSE') {
              msg = `💸 <b>Расход:</b> -${amount}`
              if (category) msg += `\n📁 ${category.name}`
              if (transaction.description) msg += `\n📝 ${transaction.description}`
            } else if (transaction.type === 'INCOME') {
              msg = `💰 <b>Доход:</b> +${amount}`
              if (category) msg += `\n📁 ${category.name}`
              if (transaction.description) msg += `\n📝 ${transaction.description}`
            } else {
              return
            }
            await sendTelegramMessage(tgConn.chatId, msg)
          }

          // Проверка бюджетов
          if (transaction.type === 'EXPENSE') {
            await checkBudgetAlerts(ctx.prisma, ctx.user.id, transaction.accountId)
          }
        } catch (err) {
          console.error('[transaction.create] Ошибка Telegram-уведомления:', err)
        }
      })()

      return transaction
    }),

  // Update transaction
  update: protectedProcedure
    .input(updateTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...data } = input

      const existing = await ctx.prisma.transaction.findUnique({ where: { id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

      const updated = await ctx.prisma.$transaction(async (tx) => {
        // Reverse old balance effect
        if (existing.type === 'INCOME') {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { decrement: existing.amount } },
          })
        } else if (existing.type === 'EXPENSE') {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: existing.amount } },
          })
        }

        // Update transaction
        const result = await tx.transaction.update({
          where: { id },
          data,
        })

        // Apply new balance effect
        const type = data.type || existing.type
        const amount = data.amount || Number(existing.amount)
        const accountId = data.accountId || existing.accountId

        if (type === 'INCOME') {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment: amount } },
          })
        } else if (type === 'EXPENSE') {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } },
          })
        }

        // Sync tags if provided
        if (tags !== undefined) {
          await tx.tagOnTransaction.deleteMany({ where: { transactionId: id } })
          for (const tagName of tags) {
            const tag = await tx.tag.upsert({
              where: { userId_name: { userId: ctx.user.id, name: tagName } },
              update: {},
              create: { userId: ctx.user.id, name: tagName },
            })
            await tx.tagOnTransaction.create({
              data: { transactionId: id, tagId: tag.id },
            })
          }
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            userId: ctx.user.id,
            action: 'update',
            entity: 'transaction',
            entityId: id,
            changes: { old: existing, new: data } as never,
          },
        })

        return result
      })

      return updated
    }),

  // Delete transaction
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.transaction.findUnique({ where: { id: input.id } })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.prisma.$transaction(async (tx) => {
        // Reverse balance effect
        if (existing.type === 'INCOME') {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { decrement: existing.amount } },
          })
        } else if (existing.type === 'EXPENSE') {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: existing.amount } },
          })
        }

        await tx.transaction.delete({ where: { id: input.id } })

        await tx.auditLog.create({
          data: {
            userId: ctx.user.id,
            action: 'delete',
            entity: 'transaction',
            entityId: input.id,
          },
        })
      })

      return { success: true }
    }),

  // Export transactions as CSV
  export: protectedProcedure
    .input(z.object({
      format: z.enum(['csv']).default('csv'),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return { data: '', filename: 'transactions.csv' }

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id },
        select: { id: true },
      })

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accounts.map(a => a.id) },
          ...(input.type ? { type: input.type } : {}),
          ...(input.dateFrom || input.dateTo ? {
            date: {
              ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
              ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
            }
          } : {}),
        },
        orderBy: { date: 'desc' },
        include: { category: { select: { name: true } }, tags: { include: { tag: { select: { name: true } } } } },
      })

      const rows = [
        ['Дата', 'Тип', 'Сумма', 'Валюта', 'Описание', 'Категория', 'Теги'].join(','),
        ...transactions.map(t => [
          t.date.toISOString().split('T')[0],
          t.type,
          t.amount,
          t.currency,
          `"${(t.description ?? '').replace(/"/g, '""')}"`,
          t.category?.name ?? '',
          t.tags.map(tt => tt.tag.name).join(';'),
        ].join(',')),
      ].join('\n')

      return { data: rows, filename: `transactions-${new Date().toISOString().split('T')[0]}.csv` }
    }),

  // Monthly report
  monthlyReport: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month - 1, 1)
      const end = new Date(input.year, input.month, 0, 23, 59, 59)
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return null
      const accounts = await ctx.prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })
      const accountIds = accounts.map(a => a.id)
      const where = { accountId: { in: accountIds }, date: { gte: start, lte: end } }
      const [income, expense, byCategory, topExpenses] = await Promise.all([
        ctx.prisma.transaction.aggregate({ where: { ...where, type: 'INCOME' }, _sum: { amount: true }, _count: true }),
        ctx.prisma.transaction.aggregate({ where: { ...where, type: 'EXPENSE' }, _sum: { amount: true }, _count: true }),
        ctx.prisma.transaction.groupBy({ by: ['categoryId'], where: { ...where, type: 'EXPENSE', categoryId: { not: null } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
        ctx.prisma.transaction.findMany({ where: { ...where, type: 'EXPENSE' }, orderBy: { amount: 'desc' }, take: 5, select: { amount: true, description: true, date: true, category: { select: { name: true } } } }),
      ])
      const catIds = byCategory.map(c => c.categoryId).filter(Boolean) as string[]
      const categories = await ctx.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
      return {
        income: { total: Number(income._sum.amount ?? 0), count: income._count },
        expense: { total: Number(expense._sum.amount ?? 0), count: expense._count },
        savings: Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0),
        byCategory: byCategory.map(c => ({ category: categories.find(cat => cat.id === c.categoryId), amount: Number(c._sum.amount ?? 0) })),
        topExpenses,
      }
    }),

  // Global search across transactions
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { query, limit } = input
      const q = query.trim()

      // Get user's wallet
      const wallet = await ctx.prisma.wallet.findFirst({
        where: { userId: ctx.user.id },
        include: { accounts: { select: { id: true } } },
      })
      if (!wallet) return []

      const accountIds = wallet.accounts.map(a => a.id)

      return ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          OR: [
            { description: { contains: q, mode: 'insensitive' } },
            { counterparty: { contains: q, mode: 'insensitive' } },
            { reference: { contains: q, mode: 'insensitive' } },
            { category: { name: { contains: q, mode: 'insensitive' } } },
            { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
          ],
        },
        include: {
          account: { select: { name: true, currency: true } },
          category: { select: { name: true, icon: true } },
          tags: { include: { tag: { select: { name: true, color: true } } } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      })
    }),
})
