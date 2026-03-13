/**
 * Tax Export — генерация отчётов для НПД (самозанятые) и ИП
 */

export interface TaxReportData {
  period: { from: string; to: string }
  type: 'self_employed' | 'ip_usn' | 'ip_osno'
  income: number
  expense: number
  taxRate: number
  taxAmount: number
  transactions: Array<{
    date: string
    description: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
    category: string
  }>
}

export function generateSelfEmployedReport(
  transactions: Array<{
    date: Date
    description: string | null
    amount: number
    type: string
    categoryName: string | null
  }>,
  period: { from: string; to: string },
): TaxReportData {
  const income = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((s, t) => s + t.amount, 0)

  const taxRate = 6 // НПД 6% для юр.лиц, 4% для физ.лиц — берём 6% как максимум
  const taxAmount = Math.round(income * taxRate / 100)

  return {
    period,
    type: 'self_employed',
    income,
    expense: 0,
    taxRate,
    taxAmount,
    transactions: transactions.map(t => ({
      date: t.date.toISOString().split('T')[0],
      description: t.description ?? '',
      amount: t.amount,
      type: t.type as 'INCOME' | 'EXPENSE',
      category: t.categoryName ?? '',
    })),
  }
}

export function generateIPReport(
  transactions: Array<{
    date: Date
    description: string | null
    amount: number
    type: string
    categoryName: string | null
  }>,
  period: { from: string; to: string },
  taxSystem: 'usn_income' | 'usn_income_expense' = 'usn_income',
): TaxReportData {
  const income = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((s, t) => s + t.amount, 0)

  const expense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0)

  let taxRate: number
  let taxAmount: number

  if (taxSystem === 'usn_income') {
    taxRate = 6
    taxAmount = Math.round(income * 6 / 100)
  } else {
    taxRate = 15
    const base = Math.max(0, income - expense)
    taxAmount = Math.round(base * 15 / 100)
    // Минимальный налог 1% от дохода
    const minTax = Math.round(income / 100)
    taxAmount = Math.max(taxAmount, minTax)
  }

  return {
    period,
    type: 'ip_usn',
    income,
    expense,
    taxRate,
    taxAmount,
    transactions: transactions.map(t => ({
      date: t.date.toISOString().split('T')[0],
      description: t.description ?? '',
      amount: t.amount,
      type: t.type as 'INCOME' | 'EXPENSE',
      category: t.categoryName ?? '',
    })),
  }
}

export function exportToCSV(report: TaxReportData): string {
  const header = 'Дата,Тип,Описание,Категория,Сумма'
  const rows = report.transactions.map(t =>
    `${t.date},${t.type === 'INCOME' ? 'Доход' : 'Расход'},"${t.description.replace(/"/g, '""')}","${t.category}",${t.amount}`
  )

  const summary = [
    '',
    `Период: ${report.period.from} — ${report.period.to}`,
    `Доход: ${report.income}`,
    `Расход: ${report.expense}`,
    `Ставка: ${report.taxRate}%`,
    `Налог: ${report.taxAmount}`,
  ]

  return [header, ...rows, ...summary].join('\n')
}
