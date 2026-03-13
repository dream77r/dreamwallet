/**
 * Тесты утилит фильтрации транзакций
 * Проверяем логику пагинации, диапазонов дат, сумм
 */
import { describe, it, expect } from 'vitest'

// ── Утилиты (дублируем логику из router) ─────────────────────────────────

interface TxFilter {
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  search?: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  description: string | null
  date: Date
}

function applyFilters(txs: Transaction[], filter: TxFilter): Transaction[] {
  return txs.filter(tx => {
    if (filter.type && tx.type !== filter.type) return false
    if (filter.dateFrom && tx.date < filter.dateFrom) return false
    if (filter.dateTo && tx.date > filter.dateTo) return false
    if (filter.amountMin !== undefined && tx.amount < filter.amountMin) return false
    if (filter.amountMax !== undefined && tx.amount > filter.amountMax) return false
    if (filter.search) {
      const q = filter.search.toLowerCase()
      if (!tx.description?.toLowerCase().includes(q)) return false
    }
    return true
  })
}

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number; totalPages: number } {
  const total = items.length
  const totalPages = Math.ceil(total / pageSize)
  const sliced = items.slice((page - 1) * pageSize, page * pageSize)
  return { items: sliced, total, totalPages }
}

// ── Тестовые данные ───────────────────────────────────────────────────────

const TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'EXPENSE', amount: 450,   description: 'Пятёрочка',  date: new Date('2026-03-01') },
  { id: '2', type: 'EXPENSE', amount: 3200,  description: 'Uber',        date: new Date('2026-03-05') },
  { id: '3', type: 'INCOME',  amount: 80000, description: 'Зарплата',    date: new Date('2026-03-10') },
  { id: '4', type: 'EXPENSE', amount: 890,   description: 'Netflix',     date: new Date('2026-03-12') },
  { id: '5', type: 'EXPENSE', amount: 12500, description: 'М.Видео',     date: new Date('2026-03-15') },
  { id: '6', type: 'TRANSFER',amount: 5000,  description: 'Перевод',     date: new Date('2026-03-20') },
  { id: '7', type: 'EXPENSE', amount: 250,   description: 'Кофе',        date: new Date('2026-02-20') },
  { id: '8', type: 'INCOME',  amount: 15000, description: 'Фриланс',     date: new Date('2026-02-28') },
]

// ── Тесты: фильтрация по типу ─────────────────────────────────────────────

describe('applyFilters — тип', () => {
  it('фильтр по EXPENSE', () => {
    const result = applyFilters(TRANSACTIONS, { type: 'EXPENSE' })
    expect(result.every(t => t.type === 'EXPENSE')).toBe(true)
    expect(result).toHaveLength(5)
  })

  it('фильтр по INCOME', () => {
    const result = applyFilters(TRANSACTIONS, { type: 'INCOME' })
    expect(result.every(t => t.type === 'INCOME')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('фильтр по TRANSFER', () => {
    const result = applyFilters(TRANSACTIONS, { type: 'TRANSFER' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('6')
  })

  it('без фильтра — все транзакции', () => {
    const result = applyFilters(TRANSACTIONS, {})
    expect(result).toHaveLength(TRANSACTIONS.length)
  })
})

// ── Тесты: фильтрация по дате ─────────────────────────────────────────────

describe('applyFilters — даты', () => {
  it('только март 2026', () => {
    const result = applyFilters(TRANSACTIONS, {
      dateFrom: new Date('2026-03-01'),
      dateTo:   new Date('2026-03-31'),
    })
    expect(result.every(t => t.date >= new Date('2026-03-01'))).toBe(true)
    expect(result.every(t => t.date <= new Date('2026-03-31'))).toBe(true)
  })

  it('только февраль 2026', () => {
    const result = applyFilters(TRANSACTIONS, {
      dateFrom: new Date('2026-02-01'),
      dateTo:   new Date('2026-02-28'),
    })
    expect(result).toHaveLength(2) // id=7 и id=8
  })

  it('dateFrom без dateTo — с начала', () => {
    const result = applyFilters(TRANSACTIONS, { dateFrom: new Date('2026-03-10') })
    expect(result.every(t => t.date >= new Date('2026-03-10'))).toBe(true)
  })

  it('dateTo без dateFrom — до конца', () => {
    const result = applyFilters(TRANSACTIONS, { dateTo: new Date('2026-02-28') })
    expect(result.every(t => t.date <= new Date('2026-02-28'))).toBe(true)
  })
})

// ── Тесты: фильтрация по сумме ────────────────────────────────────────────

describe('applyFilters — сумма', () => {
  it('только суммы от 1000', () => {
    const result = applyFilters(TRANSACTIONS, { amountMin: 1000 })
    expect(result.every(t => t.amount >= 1000)).toBe(true)
  })

  it('только суммы до 1000', () => {
    const result = applyFilters(TRANSACTIONS, { amountMax: 1000 })
    expect(result.every(t => t.amount <= 1000)).toBe(true)
  })

  it('диапазон 1000–10000', () => {
    const result = applyFilters(TRANSACTIONS, { amountMin: 1000, amountMax: 10000 })
    expect(result.every(t => t.amount >= 1000 && t.amount <= 10000)).toBe(true)
  })

  it('диапазон без совпадений → []', () => {
    const result = applyFilters(TRANSACTIONS, { amountMin: 100000, amountMax: 200000 })
    expect(result).toHaveLength(0)
  })
})

// ── Тесты: поиск по описанию ──────────────────────────────────────────────

describe('applyFilters — поиск', () => {
  it('поиск "netflix" (регистронезависимый)', () => {
    const result = applyFilters(TRANSACTIONS, { search: 'netflix' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })

  it('поиск "зарплата" (русский)', () => {
    const result = applyFilters(TRANSACTIONS, { search: 'зарплата' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('поиск несуществующего → []', () => {
    const result = applyFilters(TRANSACTIONS, { search: '__nonexistent__' })
    expect(result).toHaveLength(0)
  })
})

// ── Тесты: комбинированные фильтры ────────────────────────────────────────

describe('applyFilters — комбинированные', () => {
  it('EXPENSE + март 2026 + сумма > 500', () => {
    const result = applyFilters(TRANSACTIONS, {
      type: 'EXPENSE',
      dateFrom: new Date('2026-03-01'),
      dateTo: new Date('2026-03-31'),
      amountMin: 500,
    })
    expect(result.every(t => t.type === 'EXPENSE')).toBe(true)
    expect(result.every(t => t.amount >= 500)).toBe(true)
    expect(result.every(t => t.date >= new Date('2026-03-01'))).toBe(true)
  })
})

// ── Тесты: пагинация ──────────────────────────────────────────────────────

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('первая страница по 10', () => {
    const result = paginate(items, 1, 10)
    expect(result.items).toHaveLength(10)
    expect(result.items[0]).toBe(1)
    expect(result.total).toBe(25)
    expect(result.totalPages).toBe(3)
  })

  it('третья страница по 10 (5 элементов)', () => {
    const result = paginate(items, 3, 10)
    expect(result.items).toHaveLength(5)
    expect(result.items[0]).toBe(21)
  })

  it('пустая коллекция', () => {
    const result = paginate([], 1, 10)
    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
  })

  it('страница за пределами → пустой массив', () => {
    const result = paginate(items, 10, 10)
    expect(result.items).toHaveLength(0)
  })

  it('pageSize больше количества элементов', () => {
    const result = paginate(items, 1, 100)
    expect(result.items).toHaveLength(25)
    expect(result.totalPages).toBe(1)
  })
})
