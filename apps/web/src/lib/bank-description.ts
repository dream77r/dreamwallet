
/**
 * Clean raw bank description to extract meaningful merchant name.
 * Handles Alfa-bank, Tinkoff, Sber formats.
 */
export function cleanBankDescription(raw: string, counterparty?: string | null): string {
  if (!raw && counterparty) return counterparty
  if (!raw) return ''

  // Alfa-bank format: "Операция по карте: 220015******5327, дата создания транзакции: 28-02-2026, место совершения операции: RU/MOSCOW/MERCHANT NAME, MCC: 7230"
  const alfaMatch = raw.match(/место совершения операции:\s*(?:[A-Z]{2}\/[^/]+\/)?([^,]+)(?:,\s*MCC|$)/i)
  if (alfaMatch) {
    let merchant = alfaMatch[1].trim()
    // Clean up common patterns
    merchant = merchant.replace(/\bMCC\s*:\s*\d+/gi, '').trim()
    merchant = merchant.replace(/\s+/g, ' ').trim()
    if (merchant.length > 2) return toTitleCase(merchant)
  }

  // Tinkoff format: "MERCHANT NAME" (usually already clean, just title case)
  // Sber: "Перевод MERCHANT" 
  // Remove card numbers
  let cleaned = raw
    .replace(/\b\d{4}\*{4,}\d{4}\b/g, '')          // card numbers
    .replace(/\bОперация по карте:[^,]+,?/gi, '')       // alfa prefix
    .replace(/\bдата создания транзакции:[^,]+,?/gi, '') // alfa date
    .replace(/\bMCC:\s*\d+/gi, '')                     // MCC code
    .replace(/\bRU\/[A-Z]+\//g, '')                    // country/city prefix
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (cleaned.length > 3) return toTitleCase(cleaned.slice(0, 60))
  return counterparty || raw.slice(0, 60)
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s|\/)\S/g, l => l.toUpperCase())
}
