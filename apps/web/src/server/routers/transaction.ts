import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { createTransactionSchema, updateTransactionSchema, transactionFiltersSchema } from '@dreamwallet/shared'
import { sendTelegramMessage, formatAmount } from '@/lib/telegram-notify'
import { checkBudgetAlerts } from './budget-alerts'
import { callOpenRouter } from './ai'
import crypto from 'crypto'

// ── In-memory cache for AI category suggestions ─────────────────────────────
interface CacheEntry {
  categoryId: string
  categoryName: string
  confidence: number
  expiresAt: number
}
const suggestionCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function getCacheKey(description: string, type: string): string {
  return crypto.createHash('md5').update(description.toLowerCase() + type).digest('hex')
}

function getFromCache(key: string): CacheEntry | null {
  const entry = suggestionCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    suggestionCache.delete(key)
    return null
  }
  return entry
}

function setInCache(key: string, value: Omit<CacheEntry, 'expiresAt'>): void {
  suggestionCache.set(key, { ...value, expiresAt: Date.now() + CACHE_TTL_MS })
}

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

  // ── AI Category Suggestion ─────────────────────────────────────────────────
  suggestCategory: protectedProcedure
    .input(z.object({
      description: z.string(),
      amount: z.number().optional(),
      type: z.enum(['INCOME', 'EXPENSE']),
    }))
    .query(async ({ ctx, input }) => {
      // Skip if description too short
      if (input.description.trim().length < 3) {
        return null
      }

      // Check cache
      const cacheKey = getCacheKey(input.description, input.type)
      const cached = getFromCache(cacheKey)
      if (cached) {
        return { categoryId: cached.categoryId, categoryName: cached.categoryName, confidence: cached.confidence }
      }

      // Get user categories filtered by type
      const categories = await ctx.prisma.category.findMany({
        where: { userId: ctx.user.id, type: input.type },
        select: { id: true, name: true, icon: true },
      })

      if (categories.length === 0) return null

      // Get user AI model
      const userRecord = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { aiModel: true },
      })
      const defaultModelRow = await ctx.prisma.appSetting.findUnique({ where: { key: 'ai.defaultModel' } })
      const model = userRecord?.aiModel ?? defaultModelRow?.value ?? 'anthropic/claude-haiku-4-5'

      const categoryList = categories.map(c => `${c.icon ? c.icon + ' ' : ''}${c.name}`).join(', ')
      const prompt = `Ты финансовый аналитик. Определи категорию транзакции.

Тип операции: ${input.type === 'EXPENSE' ? 'РАСХОД' : 'ДОХОД'}
Описание: "${input.description}"${input.amount !== undefined ? `\nСумма: ${input.amount} руб` : ''}

Доступные категории: ${categoryList}

Правила:
- Выбирай категорию строго из списка выше
- confidence = твоя уверенность (0.0–1.0)
- Если описание — банковский шум или перевод → confidence < 0.3
- Для супермаркетов/доставки еды → высокая уверенность

Ответь ТОЛЬКО JSON (без markdown): { "categoryName": "название из списка", "confidence": 0.85 }`

      try {
        const raw = await callOpenRouter({ model, prompt, maxTokens: 100 })
        if (!raw) return null

        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) return null

        const parsed = JSON.parse(match[0]) as { categoryName: string; confidence: number }
        const categoryName = String(parsed.categoryName).trim()
        const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0))

        // Find matching category (case-insensitive, strip icon prefix)
        const found = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
        if (!found) return null

        const result = { categoryId: found.id, categoryName: found.name, confidence }
        setInCache(cacheKey, result)
        return result
      } catch {
        // Graceful degradation
        return null
      }
    }),

  // ── Batch Auto-Categorize ─────────────────────────────────────────────────
  autoCategorize: protectedProcedure
    .input(z.object({
      transactionIds: z.array(z.string()).optional(), // if empty — all uncategorized
      useAI: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Keyword rules for Russian bank descriptions
      const KEYWORD_RULES: Array<{ patterns: string[]; category: string; type?: 'INCOME' | 'EXPENSE' }> = [
        { patterns: ['пятёрочка', 'пятерочка', 'магнит', 'перекрёсток', 'перекресток', 'вкусвилл', 'вкус вилл', 'ашан', 'лента', 'дикси', 'metro', 'окей', 'окей', 'spar', 'спар', 'fix price', 'фикс прайс', 'светофор', 'globus', 'глобус'], category: 'Продукты' },
        { patterns: ['яндекс такси', 'yandex taxi', 'uber', 'ситимобил', 'таксовичкоф', 'rutaxi', 'indriver', 'bolt'], category: 'Транспорт' },
        { patterns: ['метро', 'московский метрополитен', 'мосметро', 'troika', 'тройка', 'электричка', 'ржд', 'rzd', 'аэроэкспресс'], category: 'Транспорт' },
        { patterns: ['аптека', 'pharmacy', 'farmacy', '36,6', '36.6', 'горздрав', 'ригла', 'eapteka', 'сбераптека', 'здравсити'], category: 'Здоровье' },
        { patterns: ['мвидео', 'м.видео', 'эльдорадо', 'dns', 'днс', 'citilink', 'ситилинк', 'технопарк', "re:store", 'restore', 'apple store'], category: 'Электроника' },
        { patterns: ['ozon', 'озон', 'wildberries', 'wb', 'ali', 'aliexpress', 'lamoda', 'яндекс маркет', 'яндекс.маркет', 'goods', 'sbermegamarket', 'мегамаркет'], category: 'Покупки' },
        { patterns: ['зарплата', 'зп ', 'salary', 'аванс', 'выплата', 'начислено'], category: 'Зарплата', type: 'INCOME' },
        { patterns: ['кафе', 'ресторан', 'restaurant', 'cafe', 'coffee', 'кофе', 'пицца', 'pizza', 'суши', 'sushi', 'burger', 'бургер', 'kfc', 'макдоналдс', 'mcdonald', 'subway', 'domino', 'додо', 'dodo', 'вкусно и точка', 'шоколадница', 'coffee bean'], category: 'Кафе и рестораны' },
        { patterns: ['ростелеком', 'мтс', 'мегафон', 'билайн', 'tele2', 'теле2', 'yota', 'йота', 'сим карта'], category: 'Связь' },
        { patterns: ['netflix', 'нетфликс', 'spotify', 'яндекс плюс', 'яндекс.плюс', 'кинопоиск', 'ivi', 'иви', 'okko', 'окко', 'vk музыка', 'сберзвук', 'premier', 'start.ru', 'amediateka'], category: 'Подписки' },
        { patterns: ['жкх', 'жилищно', 'коммунальн', 'электроэнергия', 'газ газпром', 'водоканал', 'тепло', 'управляющая компания', 'тсж', 'хcs'], category: 'ЖКХ' },
        { patterns: ['газпром нефть', 'лукойл', 'роснефть', 'bp', 'shell', 'azs', 'азс', 'заправк', 'бензин', 'топливо'], category: 'Авто' },
        { patterns: ['фитнес', 'fitness', 'спорт', 'sport', 'worldclass', 'world class', 'физра', 'бассейн', 'тренажер', 'yoga', 'йога', 'crossfit', 'кроссфит'], category: 'Спорт' },
        { patterns: ['кино', 'cinema', 'синема', 'театр', 'theatre', 'мюзикл', 'концерт', 'билет', 'kassir', 'кассир', 'ticketland'], category: 'Развлечения' },
        { patterns: ['авиабилет', 'авиа', 'аэрофлот', 's7', 'pobeda', 'победа', 'ural airlines', 'уральские авиалинии', 'booking', 'букинг', 'airbnb', 'отель', 'hotel'], category: 'Путешествия' },
      ]

      const categories = await ctx.prisma.category.findMany({
        where: { userId: ctx.user.id },
        select: { id: true, name: true, type: true },
      })

      if (categories.length === 0) {
        return { categorized: 0, skipped: 0, message: 'Нет категорий. Создайте категории сначала.' }
      }

      const catByName = new Map(categories.map(c => [c.name.toLowerCase(), c]))

      // Find uncategorized transactions
      const where = {
        userId: ctx.user.id,
        categoryId: null as null | string,
        ...(input.transactionIds?.length ? { id: { in: input.transactionIds } } : {}),
      }

      const transactions = await ctx.prisma.transaction.findMany({
        where,
        select: { id: true, description: true, counterparty: true, type: true, amount: true },
        take: 200,
      })

      if (transactions.length === 0) {
        return { categorized: 0, skipped: 0, message: 'Все транзакции уже категоризированы!' }
      }

      // Helper: keyword match
      function matchByKeywords(text: string, txType: string): string | null {
        const lower = text.toLowerCase()
        for (const rule of KEYWORD_RULES) {
          if (rule.type && rule.type !== txType) continue
          if (rule.patterns.some(p => lower.includes(p))) {
            const cat = catByName.get(rule.category.toLowerCase())
            if (cat && cat.type === txType) return cat.id
            // Try to find any category with similar name
            for (const [, c] of catByName) {
              if (c.name.toLowerCase().includes(rule.category.toLowerCase().split(' ')[0]) && c.type === txType) return c.id
            }
          }
        }
        return null
      }

      let categorized = 0
      let skipped = 0
      const aiQueue: typeof transactions = []

      // Pass 1: keyword rules
      for (const tx of transactions) {
        const text = [tx.description, tx.counterparty].filter(Boolean).join(' ')
        const categoryId = matchByKeywords(text, tx.type)
        if (categoryId) {
          await ctx.prisma.transaction.update({ where: { id: tx.id }, data: { categoryId } })
          categorized++
        } else {
          aiQueue.push(tx)
        }
      }

      // Pass 2: AI batch (if enabled and API key exists)
      if (input.useAI && aiQueue.length > 0) {
        const userRecord = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { aiModel: true } })
        const defaultModelRow = await ctx.prisma.appSetting.findUnique({ where: { key: 'ai.defaultModel' } })
        const model = userRecord?.aiModel ?? defaultModelRow?.value ?? 'anthropic/claude-haiku-4-5'

        const expenseCats = categories.filter(c => c.type === 'EXPENSE').map(c => c.name).join(', ')
        const incomeCats = categories.filter(c => c.type === 'INCOME').map(c => c.name).join(', ')

        // Process in chunks of 20
        const CHUNK = 20
        for (let i = 0; i < aiQueue.length; i += CHUNK) {
          const chunk = aiQueue.slice(i, i + CHUNK)
          const txList = chunk.map((tx, idx) => {
            const text = [tx.description, tx.counterparty].filter(Boolean).join(' | ').slice(0, 100)
            return `${idx}: type=${tx.type} amount=${tx.amount} desc="${text}"`
          }).join('\n')

          const prompt = `Ты финансовый аналитик. Твоя задача — точно категоризировать банковские транзакции россиянина.

КАТЕГОРИИ РАСХОДОВ: ${expenseCats}
КАТЕГОРИИ ДОХОДОВ: ${incomeCats}

ПРАВИЛА:
1. Анализируй название магазина/сервиса, описание и сумму
2. Банковские описания часто содержат шум — ищи ключевые слова
3. Переводы между своими счетами → null
4. Если не уверен на 70%+ → null (лучше не угадывать)
5. Учитывай контекст: ночные траты в кафе могут быть ресторан, крупные суммы в супермаркете — продукты

ПРИМЕРЫ РАСПОЗНАВАНИЯ:
- "PEREKRESTOK", "PYATEROCHKA", "MAGNIT" → Продукты
- "YANDEX.TAXI", "UBER" → Транспорт  
- "NETFLIX", "SPOTIFY", "KINOPOISK" → Подписки
- "APTEKA", "RIGLA", "GORZDRAV" → Здоровье
- "OZON", "WILDBERRIES" → Покупки
- "ZP", "SALARY", "ZARPLATA" → Зарплата

ТРАНЗАКЦИИ ДЛЯ КАТЕГОРИЗАЦИИ:
${txList}

Ответь СТРОГО JSON массивом (без markdown, без пояснений):
[{"idx":0,"category":"точное название из списка или null"},...]`

          try {
            const raw = await callOpenRouter({ model, prompt, maxTokens: 500 })
            if (!raw) { skipped += chunk.length; continue }

            const match = raw.match(/\[([\s\S]*)\]/)
            if (!match) { skipped += chunk.length; continue }

            const results = JSON.parse('[' + match[1] + ']') as Array<{ idx: number; category: string | null }>
            for (const r of results) {
              if (r.category === null || !r.category) continue
              const tx = chunk[r.idx]
              if (!tx) continue
              const cat = catByName.get(r.category.toLowerCase())
              if (cat) {
                await ctx.prisma.transaction.update({ where: { id: tx.id }, data: { categoryId: cat.id } })
                categorized++
              } else {
                skipped++
              }
            }
          } catch {
            skipped += chunk.length
          }
        }
      } else {
        skipped += aiQueue.length
      }

      return {
        categorized,
        skipped,
        message: `Категоризировано: ${categorized} из ${transactions.length} транзакций`,
      }
    }),

})