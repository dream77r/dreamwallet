import { cleanBankDescription } from '@/lib/bank-description'
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
      let duplicates = 0

      // Get user categories for auto-matching
      const categories = await ctx.prisma.category.findMany({
        where: { userId: ctx.user.id },
      })
      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))

      // ── Keyword-based auto-categorization ──────────────────────────────────
      const KEYWORD_RULES: Array<{ patterns: string[]; category: string; type?: string }> = [
        { patterns: ['пятёрочка','пятерочка','магнит','перекрёсток','перекресток','вкусвилл','ашан','лента','дикси','metro cash','окей','spar','спар','fix price','фикс прайс','светофор','globus','глобус'], category: 'Продукты' },
        { patterns: ['кафе','ресторан','restaurant','cafe','coffee','кофе','пицца','pizza','суши','sushi','burger','бургер','kfc','макдоналдс','mcdonald','subway','dodopizza','додо','dodo','шоколадница','coffee bean'], category: 'Кафе и рестораны' },
        { patterns: ['яндекс такси','yandex taxi','uber','ситимобил','таксовичкоф','rutaxi','indriver','bolt'], category: 'Транспорт' },
        { patterns: ['метро','московский метрополитен','мосметро','электричка','ржд','rzd','аэроэкспресс'], category: 'Транспорт' },
        { patterns: ['аптека','pharmacy','36,6','36.6','горздрав','ригла','eapteka','сбераптека','здравсити'], category: 'Здоровье' },
        { patterns: ['мвидео','м.видео','эльдорадо','dns','днс','citilink','ситилинк','технопарк','re:store','apple store'], category: 'Электроника' },
        { patterns: ['ozon','озон','wildberries','wb','aliexpress','lamoda','яндекс маркет','sbermegamarket','мегамаркет'], category: 'Покупки' },
        { patterns: ['зарплата','зп ','salary','аванс','начислено'], category: 'Зарплата', type: 'INCOME' },
        { patterns: ['ростелеком','мтс','мегафон','билайн','tele2','теле2','yota','йота','сим карта'], category: 'Связь' },
        { patterns: ['netflix','нетфликс','spotify','яндекс плюс','кинопоиск','ivi','okko','vk музыка','premier','amediateka'], category: 'Подписки' },
        { patterns: ['жкх','жилищно','коммунальн','электроэнергия','газ газпром','водоканал','тепло','управляющая компания','тсж'], category: 'Коммунальные' },
        { patterns: ['газпром нефть','лукойл','роснефть','bp','shell','azs','азс','заправк','бензин','топливо'], category: 'Авто' },
        { patterns: ['фитнес','fitness','worldclass','world class','бассейн','тренажер','yoga','йога','crossfit','кроссфит'], category: 'Спорт' },
        { patterns: ['кино','cinema','синема','театр','мюзикл','концерт','kassir','кассир','ticketland'], category: 'Развлечения' },
        { patterns: ['авиабилет','авиа','аэрофлот','s7','pobeda','победа','booking','букинг','airbnb','отель','hotel'], category: 'Путешествия' },
      ]
      function matchCategory(text: string, txType: string): string | null {
        const lower = text.toLowerCase()
        for (const rule of KEYWORD_RULES) {
          if (rule.type && rule.type !== txType) continue
          if (rule.patterns.some(p => lower.includes(p))) {
            const exact = categories.find(c => c.name.toLowerCase() === rule.category.toLowerCase() && c.type === txType)
            const partial = exact ?? categories.find(c => c.name.toLowerCase().includes(rule.category.toLowerCase().split(' ')[0]) && c.type === txType)
            if (partial) return partial.id
          }
        }
        return null
      }

      // ── Pre-load existing transactions for deduplication ────────────────────
      // Parse all rows first to determine date range, then batch-load existing
      type ParsedRow = {
        date: Date
        absAmount: number
        type: 'INCOME' | 'EXPENSE'
        description: string
        counterparty: string
        categoryName: string
        categoryId: string | null
      }

      const parsedRows: ParsedRow[] = []
      let minDate: Date | null = null
      let maxDate: Date | null = null

      for (const row of rows) {
        const dateStr = row[reverseMap.date] || ''
        const amountStr = row[reverseMap.amount] || ''
        const rawDescription = reverseMap.description !== undefined ? row[reverseMap.description] || '' : ''
        const description = cleanBankDescription(rawDescription, reverseMap.counterparty !== undefined ? row[reverseMap.counterparty] || '' : null)
        const counterparty = reverseMap.counterparty !== undefined ? row[reverseMap.counterparty] || '' : ''
        const categoryName = reverseMap.category !== undefined ? row[reverseMap.category] || '' : ''

        const date = parseDate(dateStr, dateFormat)
        if (!date) { skipped++; continue }

        const amount = parseAmount(amountStr)
        if (amount === null || amount === 0) { skipped++; continue }

        const type = amount > 0 ? 'INCOME' : 'EXPENSE'
        const absAmount = Math.abs(amount)

        if (!minDate || date < minDate) minDate = date
        if (!maxDate || date > maxDate) maxDate = date

        parsedRows.push({ date, absAmount, type, description, counterparty, categoryName, categoryId: null })
      }

      // Build fingerprint set from existing transactions in the same date range
      const existingFingerprints = new Set<string>()
      if (minDate && maxDate && parsedRows.length > 0) {
        const dayStart = new Date(minDate); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(maxDate); dayEnd.setHours(23, 59, 59, 999)
        const existing = await ctx.prisma.transaction.findMany({
          where: {
            accountId,
            date: { gte: dayStart, lte: dayEnd },
          },
          select: { date: true, amount: true, type: true, description: true },
        })
        for (const tx of existing) {
          const d = new Date(tx.date); d.setHours(0, 0, 0, 0)
          existingFingerprints.add(`${d.getTime()}|${tx.amount}|${tx.type}|${(tx.description || '').toLowerCase()}`)
        }
      }

      for (const row of parsedRows) {
        try {
          // Deduplication check
          const dayKey = new Date(row.date); dayKey.setHours(0, 0, 0, 0)
          const fingerprint = `${dayKey.getTime()}|${row.absAmount}|${row.type}|${row.description.toLowerCase()}`
          if (existingFingerprints.has(fingerprint)) {
            duplicates++
            continue
          }
          // Mark as seen (prevents duplicates within the same import file)
          existingFingerprints.add(fingerprint)

          // Resolve category
          let categoryId = row.categoryName ? (categoryMap.get(row.categoryName.toLowerCase()) || null) : null
          if (!categoryId) {
            const searchText = [row.description, row.counterparty].filter(Boolean).join(' ')
            categoryId = matchCategory(searchText, row.type)
          }

          await ctx.prisma.transaction.create({
            data: {
              accountId,
              type: row.type,
              amount: row.absAmount,
              currency: account.currency,
              date: row.date,
              description: row.description || undefined,
              counterparty: row.counterparty || undefined,
              categoryId,
              source: 'CSV_IMPORT',
            },
          })

          // Update account balance
          await ctx.prisma.account.update({
            where: { id: accountId },
            data: {
              balance: {
                [row.type === 'INCOME' ? 'increment' : 'decrement']: row.absAmount,
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
            duplicates,
            errors,
          },
        },
      })

      return { imported, skipped, duplicates, errors, totalRows: rows.length }
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
