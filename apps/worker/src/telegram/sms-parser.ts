/**
 * Парсер банковских SMS — распознаёт пересланные SMS из Сбер, Тинькофф, Альфа, ВТБ, Райффайзен
 * + email-чеки Ozon, Wildberries, Яндекс.Еда
 */

export interface ParsedSMS {
  amount: number
  type: 'INCOME' | 'EXPENSE'
  description: string
  card?: string
  balance?: number
}

const PATTERNS: Array<{
  bank: string
  regex: RegExp
  extract: (m: RegExpMatchArray) => ParsedSMS | null
}> = [
  // Сбер: "СБЕР: Покупка 1 234,56р. PYATEROCHKA Баланс: 45 678,90р"
  {
    bank: 'sber',
    regex: /(?:СБЕР|Сбербанк)[:\s]*(?:Покупка|Оплата|Списание)\s+([\d\s]+[.,]\d{2})\s*р\.?\s*(.+?)(?:\s*Баланс[:\s]*([\d\s]+[.,]\d{2})\s*р)?$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'EXPENSE',
      description: m[2].trim(),
      balance: m[3] ? parseRuAmount(m[3]) : undefined,
    }),
  },
  // Сбер доход: "СБЕР: Зачисление 80 000р. Зарплата Баланс: 123 456,78р"
  {
    bank: 'sber_income',
    regex: /(?:СБЕР|Сбербанк)[:\s]*(?:Зачисление|Перевод|Возврат)\s+([\d\s]+[.,]?\d*)\s*р\.?\s*(.+?)(?:\s*Баланс[:\s]*([\d\s]+[.,]\d{2})\s*р)?$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'INCOME',
      description: m[2].trim(),
      balance: m[3] ? parseRuAmount(m[3]) : undefined,
    }),
  },
  // Тинькофф: "Покупка. Карта *1234. 590 RUB. OZON. Доступно 12345.67 RUB"
  {
    bank: 'tinkoff',
    regex: /Покупка\.?\s*Карта\s*\*?(\d{4})\.?\s*([\d\s]+[.,]?\d*)\s*(?:RUB|руб)\.?\s*(.+?)\.?\s*(?:Доступно\s*([\d\s]+[.,]?\d*)\s*(?:RUB|руб))?$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[2]),
      type: 'EXPENSE',
      description: m[3].trim(),
      card: m[1],
      balance: m[4] ? parseRuAmount(m[4]) : undefined,
    }),
  },
  // Тинькофф зачисление: "Пополнение. Карта *1234. 50000 RUB. Зарплата"
  {
    bank: 'tinkoff_income',
    regex: /(?:Пополнение|Зачисление|Возврат)\.?\s*Карта\s*\*?(\d{4})\.?\s*([\d\s]+[.,]?\d*)\s*(?:RUB|руб)\.?\s*(.+?)\.?\s*(?:Доступно\s*([\d\s]+[.,]?\d*)\s*(?:RUB|руб))?$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[2]),
      type: 'INCOME',
      description: m[3].trim(),
      card: m[1],
      balance: m[4] ? parseRuAmount(m[4]) : undefined,
    }),
  },
  // Альфа-банк: "Покупка: 1234.56 RUR, Карта *5678, MERCHANT NAME. Баланс: 9999.00 RUR"
  {
    bank: 'alfa',
    regex: /Покупка[:\s]*([\d\s]+[.,]\d{2})\s*(?:RUR|RUB|руб)[\s,]*Карта\s*\*?(\d{4})[\s,]*(.+?)\.?\s*(?:Баланс[:\s]*([\d\s]+[.,]\d{2})\s*(?:RUR|RUB|руб))?$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'EXPENSE',
      description: m[3].trim(),
      card: m[2],
      balance: m[4] ? parseRuAmount(m[4]) : undefined,
    }),
  },
  // ВТБ: "Списание 1234.56 RUB *1234 MERCHANT Баланс 5678.90 RUB"
  {
    bank: 'vtb',
    regex: /(?:ВТБ|VTB)?[\s:]*Списание\s+([\d\s]+[.,]\d{2})\s*(?:RUB|руб)[.\s]*\*?(\d{4})?\s*(.+?)(?:\s*Баланс\s*([\d\s]+[.,]\d{2})\s*(?:RUB|руб))?$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'EXPENSE',
      description: m[3].trim(),
      card: m[2],
      balance: m[4] ? parseRuAmount(m[4]) : undefined,
    }),
  },
  // Райффайзен: "Raiffeisen: Pokupka 1234.56 RUB Karta *5678 MERCHANT"
  {
    bank: 'raiffeisen',
    regex: /(?:Raiffeisen|Райффайзен)[:\s]*(?:Pokupka|Покупка)\s+([\d\s]+[.,]\d{2})\s*(?:RUB|руб)[\s.]*(?:Karta|Карта)\s*\*?(\d{4})\s*(.+?)$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'EXPENSE',
      description: m[3].trim(),
      card: m[2],
    }),
  },
  // Generic: "Списание/Покупка AMOUNT руб MERCHANT" or just amount patterns
  {
    bank: 'generic',
    regex: /(?:Списание|Покупка|Оплата|Операция)[:\s]*([\d\s]+[.,]\d{2})\s*(?:руб|RUB|₽)[.\s]*(.+?)$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'EXPENSE',
      description: m[2].trim(),
    }),
  },
  // Generic income
  {
    bank: 'generic_income',
    regex: /(?:Зачисление|Пополнение|Перевод от|Возврат)[:\s]*([\d\s]+[.,]\d{2})\s*(?:руб|RUB|₽)[.\s]*(.+?)$/i,
    extract: (m) => ({
      amount: parseRuAmount(m[1]),
      type: 'INCOME',
      description: m[2].trim(),
    }),
  },
]

function parseRuAmount(s: string): number {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.'))
}

export function parseBankSMS(text: string): ParsedSMS | null {
  const cleaned = text.replace(/\n/g, ' ').trim()

  for (const { regex, extract } of PATTERNS) {
    const match = cleaned.match(regex)
    if (match) {
      const result = extract(match)
      if (result && result.amount > 0) return result
    }
  }

  return null
}
