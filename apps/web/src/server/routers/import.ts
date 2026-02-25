import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { importConfigSchema, columnMapSchema } from '@dreamwallet/shared'
import { parse } from 'csv-parse/sync'

export const importRouter = router({
  // Start import: parse the full file and create transactions
  start: protectedProcedure
    .input(z.object({
      accountId: z.string(),
      fileContent: z.string(), // base64
      fileName: z.string(),
      columnMap: z.record(z.string(), z.string()),
      dateFormat: z.string().default('DD.MM.YYYY'),
      delimiter: z.string().default(';'),
      skipRows: z.number().default(0),
      template: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { accountId, fileContent, columnMap, dateFormat, delimiter, skipRows } = input

      // Verify account belongs to user
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: accountId,
          wallet: { userId: ctx.user.id },
        },
      })

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' })
      }

      // Parse file
      const buffer = Buffer.from(fileContent, 'base64')
      const ext = input.fileName.split('.').pop()?.toLowerCase()

      let rows: string[][] = []
      let headers: string[] = []

      if (ext === 'csv') {
        const content = buffer.toString('utf-8')
        const records: string[][] = parse(content, {
          delimiter,
          relax_quotes: true,
          skip_empty_lines: true,
          trim: true,
        })
        const dataRows = records.slice(skipRows)
        headers = dataRows[0] || []
        rows = dataRows.slice(1)
      } else {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
        headers = (data[0] || []).map(String)
        rows = data.slice(1).map(r => r.map(c => c != null ? String(c) : ''))
      }

      // Build reverse mapping: target field -> column index
      const reverseMap: Record<string, number> = {}
      for (const [colName, targetField] of Object.entries(columnMap) as [string, string][]) {
        if (targetField !== 'skip') {
          const idx = headers.indexOf(colName)
          if (idx >= 0) reverseMap[targetField] = idx
        }
      }

      if (reverseMap.date === undefined || reverseMap.amount === undefined) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Date and Amount columns are required',
        })
      }

      // Process rows
      let imported = 0
      let skipped = 0
      let errors = 0

      // Get user categories for auto-matching
      const categories = await ctx.prisma.category.findMany({
        where: { userId: ctx.user.id },
      })
      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))

      for (const row of rows) {
        try {
          const dateStr = row[reverseMap.date] || ''
          const amountStr = row[reverseMap.amount] || ''
          const description = reverseMap.description !== undefined ? row[reverseMap.description] || '' : ''
          const counterparty = reverseMap.counterparty !== undefined ? row[reverseMap.counterparty] || '' : undefined
          const categoryName = reverseMap.category !== undefined ? row[reverseMap.category] || '' : ''

          // Parse date
          const date = parseDate(dateStr, dateFormat)
          if (!date) {
            skipped++
            continue
          }

          // Parse amount (handle Russian number format: "1 234,56")
          const amount = parseAmount(amountStr)
          if (amount === null || amount === 0) {
            skipped++
            continue
          }

          const type = amount > 0 ? 'INCOME' : 'EXPENSE'
          const absAmount = Math.abs(amount)

          // Try to match category
          let categoryId: string | null = null
          if (categoryName) {
            categoryId = categoryMap.get(categoryName.toLowerCase()) || null
          }

          await ctx.prisma.transaction.create({
            data: {
              accountId,
              type,
              amount: absAmount,
              currency: account.currency,
              date,
              description: description || undefined,
              counterparty: counterparty || undefined,
              categoryId,
              source: 'CSV_IMPORT',
            },
          })

          // Update account balance
          await ctx.prisma.account.update({
            where: { id: accountId },
            data: {
              balance: {
                [type === 'INCOME' ? 'increment' : 'decrement']: absAmount,
              },
            },
          })

          imported++
        } catch {
          errors++
        }
      }

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'CSV_IMPORT',
          entity: 'Transaction',
          entityId: accountId,
          changes: {
            fileName: input.fileName,
            totalRows: rows.length,
            imported,
            skipped,
            errors,
          },
        },
      })

      return { imported, skipped, errors, totalRows: rows.length }
    }),

  // Get import history
  history: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.auditLog.findMany({
      where: {
        userId: ctx.user.id,
        action: 'CSV_IMPORT',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }),
})

function parseDate(dateStr: string, format: string): Date | null {
  if (!dateStr) return null

  // Clean up
  const cleaned = dateStr.trim()

  // Try DD.MM.YYYY
  if (format === 'DD.MM.YYYY' || /^\d{2}\.\d{2}\.\d{4}/.test(cleaned)) {
    const match = cleaned.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
    if (match) {
      const [, day, month, year] = match
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }

  // Try YYYY-MM-DD
  if (format === 'YYYY-MM-DD' || /^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) return d
  }

  // Try DD/MM/YYYY
  if (format === 'DD/MM/YYYY' || /^\d{2}\/\d{2}\/\d{4}/.test(cleaned)) {
    const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (match) {
      const [, day, month, year] = match
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }

  // Fallback: try native Date parsing
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) return d

  return null
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null

  // Clean: remove spaces, replace comma with dot for Russian format
  const cleaned = amountStr
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-+]/g, '')

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}
