/**
 * Shared formatting utilities.
 * Extracted from duplicated code across dashboard, transactions, and widgets.
 */

export function formatAmount(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export function formatDateLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'

  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export function getDisplayDescription(
  description: string | null,
  counterparty: string | null,
  fallback: string,
): string {
  const isBankGarbage = (s: string) =>
    s.includes('Операция по карте') ||
    s.includes('место совершения операции') ||
    s.includes('дата создания транзакции')

  if (description && !isBankGarbage(description)) {
    return description.slice(0, 50) + (description.length > 50 ? '...' : '')
  }
  if (counterparty && counterparty.length > 0) return counterparty.slice(0, 50)
  if (description && isBankGarbage(description)) {
    const match = description.match(
      /место совершения операции:\s*(?:[A-Z]{2}\/[^/]+\/)?([^,]+)/i,
    )
    if (match) return match[1].trim().slice(0, 50)
  }
  return fallback
}
