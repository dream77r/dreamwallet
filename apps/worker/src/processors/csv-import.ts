import type { Job, Processor } from 'bullmq'
import { parse } from 'csv-parse/sync'
import { prisma } from '@dreamwallet/db'

interface CsvImportData {
  userId: string
  accountId: string
  csvContent: string
  columnMap: Record<string, string>
  dateFormat: string
  skipRows: number
}

export const csvImportProcessor: Processor<CsvImportData> = async (job: Job<CsvImportData>) => {
  const { userId, accountId, csvContent, columnMap, dateFormat, skipRows } = job.data

  const records = parse(csvContent, {
    delimiter: ',',
    from_line: skipRows + 1,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][]

  if (records.length === 0) throw new Error('No records found in CSV')

  // Get header row to map column names to indices
  const headers = records[0]
  const dataRows = records.slice(1)

  const getColumnIndex = (field: string) => {
    const colName = columnMap[field]
    if (!colName) return -1
    return headers.findIndex((h) => h.trim() === colName.trim())
  }

  const dateIdx = getColumnIndex('date')
  const amountIdx = getColumnIndex('amount')
  const descIdx = getColumnIndex('description')
  const counterpartyIdx = getColumnIndex('counterparty')

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error('Date and amount columns are required')
  }

  let imported = 0
  let errors = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    await job.updateProgress(Math.round(((i + 1) / dataRows.length) * 100))

    try {
      const rawAmount = parseFloat(row[amountIdx].replace(/[^\d.,-]/g, '').replace(',', '.'))
      if (isNaN(rawAmount)) continue

      const amount = Math.abs(rawAmount)
      const type = rawAmount >= 0 ? 'INCOME' : 'EXPENSE'

      // Parse date
      const rawDate = row[dateIdx].trim()
      let date: Date
      if (dateFormat === 'DD.MM.YYYY') {
        const [d, m, y] = rawDate.split('.')
        date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      } else if (dateFormat === 'YYYY-MM-DD') {
        date = new Date(rawDate)
      } else {
        date = new Date(rawDate)
      }

      if (isNaN(date.getTime())) continue

      await prisma.transaction.create({
        data: {
          accountId,
          type,
          amount,
          date,
          description: descIdx >= 0 ? row[descIdx]?.trim() : undefined,
          counterparty: counterpartyIdx >= 0 ? row[counterpartyIdx]?.trim() : undefined,
          source: 'CSV_IMPORT',
        },
      })

      // Update balance
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: { [type === 'INCOME' ? 'increment' : 'decrement']: amount },
        },
      })

      imported++
    } catch {
      errors++
    }
  }

  // Notify user
  await prisma.notification.create({
    data: {
      userId,
      type: 'SYSTEM',
      title: 'Импорт завершён',
      body: `Импортировано ${imported} транзакций${errors > 0 ? `, ошибок: ${errors}` : ''}`,
    },
  })

  return { imported, errors, total: dataRows.length }
}
