/**
 * AI Intent Parser — NL → structured intent
 */

export type IntentType =
  | 'query_spending'
  | 'query_balance'
  | 'navigate'
  | 'create_transaction'
  | 'set_budget'
  | 'show_report'
  | 'unknown'

export interface ParsedIntent {
  intent: IntentType
  params: Record<string, string | number | undefined>
  confidence: number
}

const INTENT_PATTERNS: Array<{
  intent: IntentType
  patterns: RegExp[]
  extract?: (match: RegExpMatchArray) => Record<string, string | number | undefined>
}> = [
  {
    intent: 'query_spending',
    patterns: [
      /сколько\s+(?:я\s+)?(?:потратил|потратила|расход)\s*(.+)?/i,
      /расходы?\s+(?:за|на|в)\s+(.+)/i,
      /траты\s+(?:за|на|в)\s+(.+)/i,
    ],
    extract: (m) => ({ period: m[1]?.trim() }),
  },
  {
    intent: 'query_balance',
    patterns: [
      /(?:какой|мой|покажи)\s+баланс/i,
      /сколько\s+(?:у\s+меня\s+)?(?:на\s+счет|денег|средств)/i,
    ],
  },
  {
    intent: 'navigate',
    patterns: [
      /(?:открой|покажи|перейди)\s+(?:в\s+)?(\w+)/i,
      /(?:хочу|давай)\s+(?:в\s+)?(\w+)/i,
    ],
    extract: (m) => ({ page: m[1]?.trim() }),
  },
  {
    intent: 'create_transaction',
    patterns: [
      /(?:добавь|запиши|создай)\s+(?:расход|трату|доход)\s+(.+)/i,
      /(?:потратил|потратила|заплатил)\s+(\d+)\s*(?:руб|₽)?\s*(?:на|за|в)\s+(.+)/i,
    ],
    extract: (m) => ({
      amount: m[1] ? parseInt(m[1], 10) : undefined,
      description: m[2]?.trim(),
    }),
  },
  {
    intent: 'set_budget',
    patterns: [
      /(?:установи|поставь|задай)\s+бюджет\s+(.+)/i,
    ],
    extract: (m) => ({ raw: m[1]?.trim() }),
  },
  {
    intent: 'show_report',
    patterns: [
      /(?:покажи|сгенерируй|дай)\s+отчёт/i,
      /отчёт\s+(?:за|по)\s+(.+)/i,
    ],
    extract: (m) => ({ period: m[1]?.trim() }),
  },
]

export function parseIntent(text: string): ParsedIntent {
  for (const { intent, patterns, extract } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return {
          intent,
          params: extract?.(match) ?? {},
          confidence: 0.8,
        }
      }
    }
  }

  return { intent: 'unknown', params: {}, confidence: 0 }
}

const NAVIGATION_MAP: Record<string, string> = {
  'транзакции': '/dashboard/transactions',
  'счета': '/dashboard/accounts',
  'бюджеты': '/dashboard/budgets',
  'цели': '/dashboard/goals',
  'аналитику': '/dashboard/analytics',
  'аналитика': '/dashboard/analytics',
  'настройки': '/dashboard/settings',
  'импорт': '/dashboard/import',
  'прогноз': '/dashboard/forecast',
  'долги': '/dashboard/debts',
  'подписки': '/dashboard/subscriptions-tracker',
  'отчёты': '/dashboard/reports',
  'достижения': '/dashboard/achievements',
  'семья': '/dashboard/family',
  'кэшбэк': '/dashboard/cashback',
}

export function resolveNavigation(page: string): string | null {
  const lower = page.toLowerCase()
  return NAVIGATION_MAP[lower] ?? null
}
