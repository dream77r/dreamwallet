// ── OpenRouter model catalog ──────────────────────────────────────────────
// Shared between server (routers/ai.ts) and client (admin/ai/page.tsx)
// NO server-only imports allowed here!

export const OPENROUTER_MODELS = [
  // Anthropic
  { id: 'anthropic/claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5',    provider: 'Anthropic', tier: 'fast',     costPer1k: 0.00025  },
  { id: 'anthropic/claude-sonnet-4-6',         name: 'Claude Sonnet 4.6',   provider: 'Anthropic', tier: 'balanced', costPer1k: 0.003    },
  { id: 'anthropic/claude-opus-4-6',           name: 'Claude Opus 4.6',     provider: 'Anthropic', tier: 'powerful', costPer1k: 0.015    },
  // OpenAI
  { id: 'openai/gpt-4o-mini',                  name: 'GPT-4o Mini',         provider: 'OpenAI',    tier: 'fast',     costPer1k: 0.00015  },
  { id: 'openai/gpt-4o',                       name: 'GPT-4o',              provider: 'OpenAI',    tier: 'powerful', costPer1k: 0.0025   },
  // Google
  { id: 'google/gemini-2.5-flash',             name: 'Gemini 2.5 Flash',    provider: 'Google',    tier: 'fast',     costPer1k: 0.00015  },
  { id: 'google/gemini-2.5-pro',               name: 'Gemini 2.5 Pro',      provider: 'Google',    tier: 'balanced', costPer1k: 0.00125  },
  // DeepSeek
  { id: 'deepseek/deepseek-chat-v3',           name: 'DeepSeek Chat v3',    provider: 'DeepSeek',  tier: 'fast',     costPer1k: 0.00014  },
  // Free models
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)',        provider: 'Meta',   tier: 'free', costPer1k: 0 },
  { id: 'google/gemini-flash-1.5-8b:free',       name: 'Gemini 1.5 Flash 8B (Free)', provider: 'Google', tier: 'free', costPer1k: 0 },
] as const

export type OpenRouterModel = typeof OPENROUTER_MODELS[number]
export type ModelTier = OpenRouterModel['tier']

// ── Retry utility ──────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  backoffMs = 500,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      // Retry on rate limit or server errors
      const status = (err as { status?: number })?.status
      if (status && status !== 429 && status < 500) throw err
      if (attempt < maxAttempts - 1) {
        await sleep(backoffMs * (attempt + 1))
      }
    }
  }
  throw lastError
}
