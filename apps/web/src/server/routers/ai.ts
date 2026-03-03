/**
 * AI Router — OpenRouter integration
 *
 * Superadmin: configure which OpenRouter models are available
 * Users: select their preferred model from available list
 */

import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { OPENROUTER_MODELS } from '@/lib/ai-models'

export type { OpenRouterModel } from '@/lib/ai-models'

const SETTINGS_KEY_MODELS = 'ai.availableModels'
const SETTINGS_KEY_DEFAULT = 'ai.defaultModel'

// ── Helper: call OpenRouter ───────────────────────────────────────────────

export async function callOpenRouter(opts: {
  model: string
  prompt: string
  maxTokens?: number
  systemPrompt?: string
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return ''

  const messages = []
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt })
  }
  messages.push({ role: 'user', content: opts.prompt })

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
    console.error('OpenRouter error:', res.status, await res.text())
    return ''
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '') as string
}

// ── Helper: get setting from DB ───────────────────────────────────────────

async function getSetting(prisma: any, key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

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
    const defaultModel = defaultRaw ?? 'anthropic/claude-haiku-4-5'

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
      const model = input.model ?? 'anthropic/claude-haiku-4-5'
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
      const modelToUse = userRecord?.aiModel ?? defaultRaw ?? 'anthropic/claude-haiku-4-5'

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
      const modelToUse = userRecord?.aiModel ?? defaultRaw ?? 'anthropic/claude-haiku-4-5'

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

      try {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('No JSON')
        const parsed = JSON.parse(match[0]) as { pattern: string; categoryName: string; confidence: number }
        return {
          pattern: String(parsed.pattern),
          categoryName: String(parsed.categoryName),
          confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
        }
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Не удалось распарсить ответ AI' })
      }
    }),

  parseReceipt: protectedProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { getAiClient } = await import('@/lib/ai-models')
        const client = await getAiClient(ctx.prisma)
        if (!client) {
          // Fallback если нет AI клиента
          return { amount: 0, description: 'Чек', date: new Date().toISOString().split('T')[0], category: 'Другое' }
        }
        const response = await client.chat.completions.create({
          model: client.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Распознай чек на изображении. Верни ТОЛЬКО JSON без markdown: {"amount": число, "description": "краткое описание покупки", "date": "YYYY-MM-DD", "category": "название категории на русском"}. Если не можешь распознать — верни {"amount": 0, "description": "Чек", "date": "' + new Date().toISOString().split('T')[0] + '", "category": "Другое"}',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` },
                },
              ],
            },
          ],
          max_tokens: 200,
        })
        const text = response.choices[0]?.message?.content ?? ''
        const parsed = JSON.parse(text.trim())
        return parsed
      } catch {
        return { amount: 0, description: 'Чек', date: new Date().toISOString().split('T')[0], category: 'Другое' }
      }
    }),
})
