/**
 * AI Router — OpenRouter integration
 *
 * Superadmin: configure which OpenRouter models are available
 * Users: select their preferred model from available list
 */

import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

// ── Популярные модели OpenRouter ──────────────────────────────────────────

export const OPENROUTER_MODELS = [
  // Anthropic
  { id: 'anthropic/claude-haiku-4-5',        name: 'Claude Haiku 4.5',        provider: 'Anthropic', tier: 'fast',     costPer1k: 0.00025 },
  { id: 'anthropic/claude-sonnet-4-5',       name: 'Claude Sonnet 4.5',       provider: 'Anthropic', tier: 'balanced', costPer1k: 0.003   },
  { id: 'anthropic/claude-opus-4-5',         name: 'Claude Opus 4.5',         provider: 'Anthropic', tier: 'powerful', costPer1k: 0.015   },
  // OpenAI
  { id: 'openai/gpt-4o-mini',               name: 'GPT-4o Mini',             provider: 'OpenAI',    tier: 'fast',     costPer1k: 0.00015 },
  { id: 'openai/gpt-4o',                    name: 'GPT-4o',                  provider: 'OpenAI',    tier: 'powerful', costPer1k: 0.0025  },
  // Google
  { id: 'google/gemini-flash-1.5',           name: 'Gemini 1.5 Flash',        provider: 'Google',    tier: 'fast',     costPer1k: 0.000075 },
  { id: 'google/gemini-pro-1.5',             name: 'Gemini 1.5 Pro',          provider: 'Google',    tier: 'balanced', costPer1k: 0.00125  },
  // DeepSeek
  { id: 'deepseek/deepseek-chat',            name: 'DeepSeek Chat',           provider: 'DeepSeek',  tier: 'fast',     costPer1k: 0.00014 },
  // Meta (Free)
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', provider: 'Meta',   tier: 'free',     costPer1k: 0       },
  { id: 'google/gemini-flash-1.5-8b:free',   name: 'Gemini 1.5 Flash 8B (Free)', provider: 'Google', tier: 'free',  costPer1k: 0       },
] as const

export type OpenRouterModel = typeof OPENROUTER_MODELS[number]

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
})
