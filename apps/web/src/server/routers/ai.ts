/**
 * AI Router — OpenRouter integration
 *
 * Superadmin: configure which OpenRouter models are available
 * Users: select their preferred model from available list
 */

import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { OPENROUTER_MODELS, withRetry } from '@/lib/ai-models'

export type { OpenRouterModel } from '@/lib/ai-models'

const SETTINGS_KEY_MODELS = 'ai.availableModels'
const SETTINGS_KEY_DEFAULT = 'ai.defaultModel'

// ── In-memory caches for new AI features ─────────────────────────────────
interface AnomalyCacheEntry { data: unknown[]; expiresAt: number }
interface InsightsCacheEntry { data: unknown[]; expiresAt: number }
const anomalyCache = new Map<string, AnomalyCacheEntry>()
const insightsCache = new Map<string, InsightsCacheEntry>()

// ── Helper: call OpenRouter ───────────────────────────────────────────────

export async function callOpenRouter(opts: {
  model: string
  prompt: string
  maxTokens?: number
  systemPrompt?: string
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return ''

  const messages: Array<{ role: string; content: string }> = []
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt })
  }
  messages.push({ role: 'user', content: opts.prompt })

  return withRetry(async () => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://dreamwallet.app',
        'X-Title': 'DreamWallet',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 600,
        messages,
      }),
    })

    if (!res.ok) {
      const err = new Error(`OpenRouter error: ${res.status}`) as Error & { status: number }
      err.status = res.status
      console.error('OpenRouter error:', res.status, await res.text())
      throw err
    }

    const data = await res.json()
    return (data.choices?.[0]?.message?.content ?? '') as string
  }, 3, 500)
}

// ── Helper: get setting from DB ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSetting(prisma: any, key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSetting(prisma: any, key: string, value: string, userId?: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: userId },
    update: { value, updatedBy: userId },
  })
}

// ── Router ────────────────────────────────────────────────────────────────

export const aiRouter = router({
  // All users: get available models + default
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const [modelsRaw, defaultRaw, user] = await Promise.all([
      getSetting(ctx.prisma, SETTINGS_KEY_MODELS),
      getSetting(ctx.prisma, SETTINGS_KEY_DEFAULT),
      ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { aiModel: true } }),
    ])

    const enabledIds: string[] = modelsRaw ? JSON.parse(modelsRaw) : []
    const defaultModel = defaultRaw ?? 'anthropic/claude-haiku-4-5-20251001'

    const available = enabledIds.length > 0
      ? OPENROUTER_MODELS.filter(m => enabledIds.includes(m.id))
      : [OPENROUTER_MODELS[0]] // default: Haiku

    return {
      available,
      defaultModel,
      userModel: user?.aiModel ?? null,
      activeModel: user?.aiModel ?? defaultModel,
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
    }
  }),

  // User: set their preferred model
  setMyModel: protectedProcedure
    .input(z.object({ model: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { aiModel: input.model },
      })
      return { ok: true }
    }),

  // Superadmin: get all available OpenRouter models list
  getAllModels: superAdminProcedure.query(async ({ ctx }) => {
    const modelsRaw = await getSetting(ctx.prisma, SETTINGS_KEY_MODELS)
    const enabledIds: string[] = modelsRaw ? JSON.parse(modelsRaw) : []
    return {
      all: OPENROUTER_MODELS,
      enabledIds,
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
    }
  }),

  // Superadmin: set which models users can choose from
  setAvailableModels: superAdminProcedure
    .input(z.object({
      modelIds: z.array(z.string()).min(1, 'Выберите хотя бы одну модель'),
      defaultModel: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all([
        setSetting(ctx.prisma, SETTINGS_KEY_MODELS, JSON.stringify(input.modelIds), ctx.user.id),
        setSetting(ctx.prisma, SETTINGS_KEY_DEFAULT, input.defaultModel, ctx.user.id),
      ])
      return { ok: true }
    }),

  // Superadmin: test OpenRouter connection
  testConnection: superAdminProcedure
    .input(z.object({ model: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'OPENROUTER_API_KEY не задан' })
      }
      const model = input.model ?? 'anthropic/claude-haiku-4-5-20251001'
      const result = await callOpenRouter({
        model,
        prompt: 'Ответь одним словом: тест прошёл?',
        maxTokens: 20,
      })
      if (!result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Нет ответа от OpenRouter' })
      return { ok: true, model, response: result }
    }),

  // Superadmin: set who has SUPER_ADMIN role
  setSuperAdmin: superAdminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({ where: { email: input.email } })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Пользователь не найден' })
      await ctx.prisma.user.update({ where: { id: user.id }, data: { role: 'SUPER_ADMIN' } })
      return { ok: true }
    }),

  // ── AI Chat Advisor ────────────────────────────────────────────────────
  chat: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      // Get user's preferred model
      const userRecord = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { aiModel: true },
      })
      const defaultRaw = await getSetting(ctx.prisma, SETTINGS_KEY_DEFAULT)
      const modelToUse = userRecord?.aiModel ?? defaultRaw ?? 'anthropic/claude-haiku-4-5-20251001'

      // Get recent transactions for context
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      const recentTransactions = wallet
        ? await ctx.prisma.transaction.findMany({
            where: { account: { walletId: wallet.id } },
            orderBy: { date: 'desc' },
            take: 20,
            include: { category: { select: { name: true } } },
          })
        : []

      const summary = recentTransactions
        .map(
          (t) =>
            `${t.date.toISOString().split('T')[0]} ${t.type} ${t.amount} ${t.currency} ${t.category?.name ?? 'без категории'} "${t.description ?? ''}"`,
        )
        .join('\n')

      const systemPrompt = `Ты персональный финансовый советник в приложении DreamWallet. Отвечай на русском языке кратко и по делу. У тебя есть данные о последних транзакциях пользователя:

${summary || 'Транзакции не найдены.'}

Помогай с вопросами о расходах, категориях, финансовых привычках. Давай конкретные советы на основе данных.`

      const reply = await callOpenRouter({
        model: modelToUse,
        systemPrompt,
        prompt: input.message,
        maxTokens: 800,
      })

      if (!reply) {
        return { reply: 'К сожалению, AI-сервис временно недоступен. Попробуйте позже.' }
      }

      return { reply }
    }),

  // ── AI Auto-Rule Suggestion ────────────────────────────────────────────
  suggestAutoRule: protectedProcedure
    .input(z.object({ description: z.string().min(3).max(200) }))
    .mutation(async ({ ctx, input }) => {
      // Get user's preferred model
      const userRecord = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { aiModel: true },
      })
      const defaultRaw = await getSetting(ctx.prisma, SETTINGS_KEY_DEFAULT)
      const modelToUse = userRecord?.aiModel ?? defaultRaw ?? 'anthropic/claude-haiku-4-5-20251001'

      // Get user categories
      const categories = await ctx.prisma.category.findMany({
        where: { userId: ctx.user.id },
        select: { name: true, type: true },
      })

      const categoryList = categories.map((c) => `${c.name} (${c.type})`).join(', ')

      const prompt = `Пользователь описывает правило автокатегоризации транзакций словами:
"${input.description}"

Доступные категории: ${categoryList || 'нет категорий'}

Ответь ТОЛЬКО JSON без markdown:
{"pattern":"ключевое слово или regex для поиска в описании транзакции","categoryName":"точное название категории из списка","confidence":число от 0 до 100}`

      const raw = await callOpenRouter({
        model: modelToUse,
        prompt,
        maxTokens: 200,
      })

      if (!raw) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI-сервис недоступен' })
      }

      const autoRuleSchema = z.object({
        pattern: z.string(),
        categoryName: z.string(),
        confidence: z.number().min(0).max(100),
      })

      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Не удалось распарсить ответ AI' })

      let jsonData: unknown
      try { jsonData = JSON.parse(match[0]) } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Не удалось распарсить ответ AI' })
      }

      const parsed = autoRuleSchema.safeParse(jsonData)
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Некорректный формат ответа AI' })
      }
      return {
        pattern: parsed.data.pattern,
        categoryName: parsed.data.categoryName,
        confidence: Math.min(100, Math.max(0, parsed.data.confidence)),
      }
    }),

  parseReceipt: protectedProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const fallback = { amount: 0, description: 'Чек', date: new Date().toISOString().split('T')[0], category: 'Другое' }
      try {
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) return fallback

        // Use a vision-capable model; prefer user's model if it supports vision
        const userRecord = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: { aiModel: true },
        })
        const defaultRaw = await getSetting(ctx.prisma, SETTINGS_KEY_DEFAULT)
        const preferredModel = userRecord?.aiModel ?? defaultRaw ?? null
        // Fall back to gpt-4o for vision if user's model isn't vision-capable
        const VISION_CAPABLE = ['openai/gpt-4o', 'openai/gpt-4o-mini', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro']
        const model = preferredModel && VISION_CAPABLE.includes(preferredModel) ? preferredModel : 'openai/gpt-4o'

        const today = new Date().toISOString().split('T')[0]
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? '',
            'X-Title': 'DreamWallet',
          },
          body: JSON.stringify({
            model,
            max_tokens: 400,
            messages: [{ role: 'user', content: [
              { type: 'text', text: 'Распознай чек. Верни ТОЛЬКО JSON: {"amount": число, "description": "описание", "date": "YYYY-MM-DD", "category": "категория на русском"}. Если не чек — {"amount": 0, "description": "Чек", "date": "' + today + '", "category": "Другое"}' },
              { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + input.imageBase64 } },
            ]}],
          }),
        })
        if (!res.ok) return fallback

        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const text = data.choices[0]?.message?.content ?? ''

        const receiptSchema = z.object({
          amount: z.number(),
          description: z.string(),
          date: z.string(),
          category: z.string(),
        })

        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return fallback

        const parsed = receiptSchema.safeParse(JSON.parse(match[0]))
        return parsed.success ? parsed.data : fallback
      } catch {
        return fallback
      }
    }),

  // ── Detect Anomalies ───────────────────────────────────────────────────
  detectAnomalies: protectedProcedure.query(async ({ ctx }) => {
    // In-memory cache per user, 6h TTL
    const cacheKey = `anomalies:${ctx.user.id}`
    const cached = anomalyCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) return cached.data

    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const walletAccounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
    const walletAccountIds = walletAccounts.map(a => a.id)

    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        accountId: { in: walletAccountIds },
        date: { gte: threeMonthsAgo },
        type: 'EXPENSE',
      },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    })

    if (transactions.length < 5) return []

    const userRecord = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { aiModel: true } })
    const defaultRaw = await getSetting(ctx.prisma, SETTINGS_KEY_DEFAULT)
    const model = userRecord?.aiModel ?? defaultRaw ?? 'anthropic/claude-haiku-4-5-20251001'

    const txSummary = transactions.slice(0, 100).map(t =>
      `${t.date.toISOString().split('T')[0]} ${t.amount} руб ${t.category?.name ?? 'без категории'} "${t.description ?? ''}"`,
    ).join('\n')

    const systemPrompt = `Ты финансовый аналитик. Анализируй транзакции и находи аномалии. Отвечай на русском языке.`
    const prompt = `Проанализируй транзакции пользователя за последние 3 месяца и найди аномалии.

Транзакции:
${txSummary}

Найди 3-5 аномалий: необычно крупные суммы, новые категории трат, ночные покупки, подозрительные паттерны.

Ответь ТОЛЬКО JSON массивом (без markdown):
[{"type": "large_amount|new_category|unusual_time|pattern", "description": "описание аномалии на русском", "amount": число или null, "date": "YYYY-MM-DD или null"}]`

    const raw = await callOpenRouter({ model, prompt, systemPrompt, maxTokens: 500 })
    if (!raw) return []

    const anomalySchema = z.array(z.object({
      type: z.string(),
      description: z.string(),
      amount: z.number().nullable().optional(),
      date: z.string().nullable().optional(),
    }))

    try {
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) return []
      const parsed = anomalySchema.safeParse(JSON.parse(match[0]))
      const data = parsed.success ? parsed.data : []
      anomalyCache.set(cacheKey, { data, expiresAt: Date.now() + 6 * 60 * 60 * 1000 })
      return data
    } catch {
      return []
    }
  }),

  // ── Get Insights ───────────────────────────────────────────────────────
  getInsights: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `insights:${ctx.user.id}`
    const cached = insightsCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) return cached.data

    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const insightAccounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
    const insightAccountIds = insightAccounts.map(a => a.id)

    const [thisMonth, lastMonth, budgets] = await Promise.all([
      ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { accountId: { in: insightAccountIds }, type: 'EXPENSE', date: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { accountId: { in: insightAccountIds }, type: 'EXPENSE', date: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      ctx.prisma.budget.findMany({
        where: { walletId: wallet.id },
        select: { amount: true, categoryId: true },
      }),
    ])

    const catIds = [...new Set([
      ...thisMonth.map(r => r.categoryId),
      ...lastMonth.map(r => r.categoryId),
      ...budgets.map(b => b.categoryId),
    ].filter(Boolean) as string[])]
    const categories = await ctx.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    const catMap = new Map(categories.map(c => [c.id, c.name]))

    const thisMonthStr = thisMonth.map(r => `${catMap.get(r.categoryId ?? '') ?? 'Другое'}: ${Number(r._sum.amount ?? 0)} руб`).join(', ')
    const lastMonthStr = lastMonth.map(r => `${catMap.get(r.categoryId ?? '') ?? 'Другое'}: ${Number(r._sum.amount ?? 0)} руб`).join(', ')
    const budgetsStr = budgets.map(b => `${catMap.get(b.categoryId) ?? 'Категория'}: лимит ${Number(b.amount)} руб`).join(', ')

    const userRecord = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { aiModel: true } })
    const defaultRaw = await getSetting(ctx.prisma, SETTINGS_KEY_DEFAULT)
    const model = userRecord?.aiModel ?? defaultRaw ?? 'anthropic/claude-haiku-4-5-20251001'

    const systemPrompt = `Ты персональный финансовый советник. Генерируй краткие, конкретные инсайты на русском языке.`
    const prompt = `Проанализируй финансы пользователя и дай 3-5 инсайтов.

Расходы этого месяца: ${thisMonthStr || 'нет данных'}
Расходы прошлого месяца: ${lastMonthStr || 'нет данных'}
Бюджеты: ${budgetsStr || 'не настроены'}

Генерируй конкретные, персонализированные инсайты. Примеры:
- "Вы потратили на рестораны на 40% больше, чем в прошлом месяце"
- "Расходы на продукты в рамках бюджета — отлично!"
- "Траты на подписки выросли на 2000 руб"

Ответь ТОЛЬКО JSON массивом (без markdown):
[{"type": "increase|decrease|warning|positive", "text": "инсайт на русском", "category": "категория или null"}]`

    const raw = await callOpenRouter({ model, prompt, systemPrompt, maxTokens: 400 })
    if (!raw) return []

    const insightSchema = z.array(z.object({
      type: z.enum(['increase', 'decrease', 'warning', 'positive']),
      text: z.string(),
      category: z.string().nullable().optional(),
    }))

    try {
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) return []
      const parsed = insightSchema.safeParse(JSON.parse(match[0]))
      const data = parsed.success ? parsed.data : []
      insightsCache.set(cacheKey, { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })
      return data
    } catch {
      return []
    }
  }),

  // ── Suggest Budgets ────────────────────────────────────────────────────
  suggestBudgets: protectedProcedure.mutation(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const budgetAccounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
    const budgetAccountIds = budgetAccounts.map(a => a.id)

    const spending = await ctx.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        accountId: { in: budgetAccountIds },
        type: 'EXPENSE',
        date: { gte: threeMonthsAgo },
        categoryId: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    })

    if (spending.length === 0) return []

    const catIds = spending.map(s => s.categoryId).filter(Boolean) as string[]
    const categories = await ctx.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    const catMap = new Map(categories.map(c => [c.id, c]))

    // Calculate monthly averages
    const suggestions = spending
      .map(s => {
        const cat = catMap.get(s.categoryId ?? '')
        if (!cat) return null
        const monthlyAvg = Number(s._sum.amount ?? 0) / 3
        const suggestedLimit = Math.ceil(monthlyAvg * 1.15 / 100) * 100 // +15%, round up to 100
        return { categoryId: cat.id, categoryName: cat.name, monthlyAvg: Math.round(monthlyAvg), suggestedLimit }
      })
      .filter(Boolean)
      .filter(s => s!.monthlyAvg > 100) // skip very small categories
      .sort((a, b) => b!.monthlyAvg - a!.monthlyAvg)
      .slice(0, 10)

    return suggestions as Array<{ categoryId: string; categoryName: string; monthlyAvg: number; suggestedLimit: number }>
  }),
})
