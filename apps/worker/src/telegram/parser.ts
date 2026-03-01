/**
 * Парсер текстовых сообщений и голосовых транскриптов
 * Примеры: "кофе 300", "зарплата 80000", "потратил 1500 на еду"
 */

export interface ParsedTransaction {
  amount: number
  type: 'INCOME' | 'EXPENSE'
  description: string
  confidence: number // 0..1
}

const INCOME_KEYWORDS = [
  'зарплата', 'зп', 'зарп', 'аванс', 'доход', 'получил', 'получила',
  'поступление', 'пришло', 'заработал', 'заработала', 'продал', 'продала',
  'выплата', 'дивиденды', 'возврат', 'кэшбэк', 'cashback', 'перевод получил',
]

const AMOUNT_PATTERNS = [
  /(\d[\d\s]*[\d])[\s]*(тысяч|тыс|к|k)\b/i,  // "300 тысяч", "5к", "5k"
  /(\d+(?:[.,]\d{1,2})?)[\s]*(руб(?:лей|ля|\.)?|₽|rub)\b/i,
  /(\d+(?:[.,]\d{1,2})?)/,  // просто число — последний вариант
]

const MULTIPLIER_PATTERN = /(\d[\d\s]*[\d]?)[\s]*(тысяч|тыс|к|k)\b/i

export function parseTransactionText(text: string): ParsedTransaction | null {
  const normalized = text.trim().toLowerCase()

  // Извлекаем сумму
  let amount = 0
  let amountMatch: RegExpMatchArray | null = null

  // Проверяем на "5к", "300 тысяч"
  const mulMatch = normalized.match(MULTIPLIER_PATTERN)
  if (mulMatch) {
    amount = parseFloat(mulMatch[1].replace(/\s/g, '')) * 1000
    amountMatch = mulMatch
  } else {
    for (const pattern of AMOUNT_PATTERNS) {
      const m = normalized.match(pattern)
      if (m) {
        amount = parseFloat(m[1].replace(',', '.').replace(/\s/g, ''))
        amountMatch = m
        break
      }
    }
  }

  if (!amount || amount <= 0) return null

  // Определяем тип
  const isIncome = INCOME_KEYWORDS.some((kw) => normalized.includes(kw))
  const type: 'INCOME' | 'EXPENSE' = isIncome ? 'INCOME' : 'EXPENSE'

  // Описание = текст без суммы и единиц
  let description = text
    .replace(/\d[\d\s]*[\d]?[\s]*(тысяч|тыс|к|k)/gi, '')
    .replace(/\d+(?:[.,]\d{1,2})?[\s]*(руб(?:лей|ля|\.)?|₽|rub)/gi, '')
    .replace(/\d+(?:[.,]\d{1,2})?/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Если описание пустое — используем первое слово оригинала
  if (!description) {
    description = text.split(/\s+/)[0] ?? 'Транзакция'
  }

  // Капитализируем первую букву
  description = description.charAt(0).toUpperCase() + description.slice(1)

  return {
    amount,
    type,
    description,
    confidence: amountMatch ? 0.9 : 0.5,
  }
}

/** Форматирование суммы для ответа бота */
export function formatAmount(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
