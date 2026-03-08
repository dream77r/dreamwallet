/**
 * Тесты Zod-валидации AI ответов
 * Проверяем что схемы корректно обрабатывают валидный/невалидный JSON
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ── Схемы (зеркало из routers/ai.ts и routers/transaction.ts) ────────────

const receiptSchema = z.object({
  amount: z.number(),
  description: z.string(),
  date: z.string(),
  category: z.string(),
})

const categorySuggestionSchema = z.object({
  categoryName: z.string(),
  confidence: z.number().min(0).max(1),
})

const autoRuleSchema = z.object({
  pattern: z.string(),
  categoryName: z.string(),
  confidence: z.number().min(0).max(100),
})

const anomalySchema = z.array(z.object({
  type: z.string(),
  description: z.string(),
  amount: z.number().nullable().optional(),
  date: z.string().nullable().optional(),
}))

const insightSchema = z.array(z.object({
  type: z.enum(['increase', 'decrease', 'warning', 'positive']),
  text: z.string(),
  category: z.string().nullable().optional(),
}))

// ── Вспомогательная функция — парсинг JSON из AI ответа ───────────────────

function extractJson(raw: string): unknown | null {
  const objMatch = raw.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch { return null }
  }
  const arrMatch = raw.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch { return null }
  }
  return null
}

// ── Тесты: receiptSchema ──────────────────────────────────────────────────

describe('receiptSchema', () => {
  it('принимает корректный чек', () => {
    const result = receiptSchema.safeParse({
      amount: 450.50,
      description: 'Продукты',
      date: '2026-03-08',
      category: 'Продукты',
    })
    expect(result.success).toBe(true)
  })

  it('принимает чек с нулевой суммой (fallback)', () => {
    const result = receiptSchema.safeParse({
      amount: 0,
      description: 'Чек',
      date: '2026-03-08',
      category: 'Другое',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет ответ без суммы', () => {
    const result = receiptSchema.safeParse({
      description: 'Продукты',
      date: '2026-03-08',
      category: 'Продукты',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет ответ со строкой вместо суммы', () => {
    const result = receiptSchema.safeParse({
      amount: '450',
      description: 'Продукты',
      date: '2026-03-08',
      category: 'Продукты',
    })
    expect(result.success).toBe(false)
  })

  it('парсит JSON из AI ответа с markdown-обёрткой', () => {
    const raw = '```json\n{"amount": 1500, "description": "Кофе", "date": "2026-03-08", "category": "Кафе и рестораны"}\n```'
    const json = extractJson(raw)
    const result = receiptSchema.safeParse(json)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(1500)
      expect(result.data.category).toBe('Кафе и рестораны')
    }
  })

  it('возвращает null при пустом ответе AI', () => {
    const json = extractJson('')
    expect(json).toBeNull()
  })

  it('возвращает null при ответе без JSON', () => {
    const json = extractJson('Извините, я не могу распознать чек.')
    expect(json).toBeNull()
  })
})

// ── Тесты: categorySuggestionSchema ──────────────────────────────────────

describe('categorySuggestionSchema', () => {
  it('принимает корректный ответ', () => {
    const result = categorySuggestionSchema.safeParse({
      categoryName: 'Продукты',
      confidence: 0.95,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.confidence).toBe(0.95)
    }
  })

  it('отклоняет confidence > 1', () => {
    const result = categorySuggestionSchema.safeParse({
      categoryName: 'Продукты',
      confidence: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет confidence < 0', () => {
    const result = categorySuggestionSchema.safeParse({
      categoryName: 'Продукты',
      confidence: -0.1,
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет пустой объект', () => {
    const result = categorySuggestionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('парсит из строки AI ответа', () => {
    const raw = '{ "categoryName": "Транспорт", "confidence": 0.88 }'
    const json = extractJson(raw)
    const result = categorySuggestionSchema.safeParse(json)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categoryName).toBe('Транспорт')
    }
  })
})

// ── Тесты: autoRuleSchema ─────────────────────────────────────────────────

describe('autoRuleSchema', () => {
  it('принимает корректное правило', () => {
    const result = autoRuleSchema.safeParse({
      pattern: 'пятёрочка',
      categoryName: 'Продукты',
      confidence: 92,
    })
    expect(result.success).toBe(true)
  })

  it('принимает confidence = 0', () => {
    const result = autoRuleSchema.safeParse({
      pattern: 'перевод',
      categoryName: 'Без категории',
      confidence: 0,
    })
    expect(result.success).toBe(true)
  })

  it('принимает confidence = 100', () => {
    const result = autoRuleSchema.safeParse({
      pattern: 'зарплата',
      categoryName: 'Зарплата',
      confidence: 100,
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет confidence > 100', () => {
    const result = autoRuleSchema.safeParse({
      pattern: 'test',
      categoryName: 'Test',
      confidence: 101,
    })
    expect(result.success).toBe(false)
  })
})

// ── Тесты: anomalySchema ──────────────────────────────────────────────────

describe('anomalySchema', () => {
  it('принимает список аномалий', () => {
    const result = anomalySchema.safeParse([
      { type: 'large_amount', description: 'Необычно крупная покупка', amount: 50000, date: '2026-03-01' },
      { type: 'new_category', description: 'Новая категория: Путешествия', amount: null, date: null },
    ])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
    }
  })

  it('принимает пустой массив', () => {
    const result = anomalySchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('отклоняет не-массив', () => {
    const result = anomalySchema.safeParse({ type: 'large_amount', description: 'test' })
    expect(result.success).toBe(false)
  })
})

// ── Тесты: insightSchema ──────────────────────────────────────────────────

describe('insightSchema', () => {
  it('принимает валидные инсайты', () => {
    const result = insightSchema.safeParse([
      { type: 'increase', text: 'Рестораны +40% к прошлому месяцу', category: 'Кафе и рестораны' },
      { type: 'positive', text: 'Продукты в рамках бюджета', category: 'Продукты' },
      { type: 'warning', text: 'Бюджет на транспорт исчерпан на 90%', category: null },
    ])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0].type).toBe('increase')
    }
  })

  it('отклоняет неизвестный тип инсайта', () => {
    const result = insightSchema.safeParse([
      { type: 'unknown_type', text: 'Что-то случилось', category: null },
    ])
    expect(result.success).toBe(false)
  })

  it('принимает инсайт без категории', () => {
    const result = insightSchema.safeParse([
      { type: 'decrease', text: 'Траты снизились в целом' },
    ])
    expect(result.success).toBe(true)
  })
})
