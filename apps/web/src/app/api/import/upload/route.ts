import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { parse } from 'csv-parse/sync'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_PREVIEW_ROWS = 10

export async function POST(request: NextRequest) {
  // Auth check
  const headerList = await headers()
  const session = await auth.api.getSession({ headers: headerList })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const template = formData.get('template') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase()

  if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    let headers: string[] = []
    let rows: string[][] = []

    if (ext === 'csv') {
      const result = parseCsv(buffer, template)
      headers = result.headers
      rows = result.rows
    } else {
      // XLSX/XLS - use xlsx library
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

      if (data.length > 0) {
        headers = (data[0] || []).map(String)
        rows = data.slice(1, MAX_PREVIEW_ROWS + 1).map(row =>
          row.map(cell => cell != null ? String(cell) : '')
        )
      }
    }

    // Auto-detect column mapping based on template or header names
    const suggestedMapping = autoDetectMapping(headers, template)

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      headers,
      previewRows: rows,
      totalRows: rows.length,
      suggestedMapping,
      // Store file content as base64 for later use
      fileContent: buffer.toString('base64'),
    })
  } catch (error) {
    console.error('Import parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 422 },
    )
  }
}

function parseCsv(buffer: Buffer, template: string | null) {
  // Try different delimiters
  const content = buffer.toString('utf-8')
  const delimiter = detectDelimiter(content, template)

  const records: string[][] = parse(content, {
    delimiter,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  })

  const skipRows = getSkipRows(template)
  const dataRows = records.slice(skipRows)

  if (dataRows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = dataRows[0]
  const rows = dataRows.slice(1, MAX_PREVIEW_ROWS + 1)

  return { headers, rows }
}

// ── Bank template definitions ──────────────────────────────────────────────
// Each bank: delimiter, skipRows, column mapping

type BankTemplate = {
  delimiter: string
  skipRows: number
  map: Record<string, string>
}

const BANK_TEMPLATES: Record<string, BankTemplate> = {
  tinkoff: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата операции': 'date',
      'Дата платежа': 'date',
      'Описание': 'description',
      'Сумма операции': 'amount',
      'Сумма платежа': 'amount',
      'Категория': 'category',
      'MCC': 'skip',
      'Статус': 'skip',
      'Номер карты': 'skip',
      'Кэшбэк': 'skip',
      'Бонусы (начислено)': 'skip',
      'Бонусы (списано)': 'skip',
      'Валюта операции': 'skip',
      'Валюта платежа': 'skip',
    },
  },
  sber: {
    delimiter: ';',
    skipRows: 1, // First row is account metadata
    map: {
      'Дата': 'date',
      'Дата и время операции': 'date',
      'Описание операции': 'description',
      'Описание': 'description',
      'Сумма': 'amount',
      'Сумма операции': 'amount',
      'Категория': 'category',
      'Номер карты': 'skip',
    },
  },
  alfa: {
    delimiter: ';',
    skipRows: 0,
    map: {
      // New format (2024)
      'Дата операции': 'date',
      'Дата обработки': 'skip',
      'Описание операции': 'description',
      'Категория': 'category',
      'MCC-код': 'skip',
      'Сумма': 'amount',
      'Дебет': 'amount',
      'Кредит': 'amount',
      'Валюта': 'skip',
      'MCC': 'skip',
      // Older format
      'Дата': 'date',
      'Описание': 'description',
    },
  },
  vtb: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата совершения операции': 'date',
      'Дата отражения операции': 'skip',
      'Наименование операции': 'description',
      'Описание': 'description',
      'Дебет': 'amount',
      'Кредит': 'amount',
      'Сумма': 'amount',
      'Остаток': 'skip',
      'Номер счёта': 'skip',
      'Тип операции': 'skip',
      'Валюта': 'skip',
    },
  },
  raiffeisen: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата транзакции': 'date',
      'Дата проводки': 'skip',
      'Тип': 'skip',
      'Сумма': 'amount',
      'Валюта': 'skip',
      'Контрагент': 'counterparty',
      'Категория': 'category',
      'Описание': 'description',
      'Номер документа': 'skip',
      'Баланс': 'skip',
    },
  },
  gazprom: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата': 'date',
      'Дата операции': 'date',
      'Сумма': 'amount',
      'Описание': 'description',
      'Назначение': 'description',
      'Категория': 'category',
      'Валюта': 'skip',
    },
  },
  ozon: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата операции': 'date',
      'Дата': 'date',
      'Описание': 'description',
      'Наименование операции': 'description',
      'Сумма': 'amount',
      'Тип': 'skip',
      'Статус': 'skip',
    },
  },
  pochtabank: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата': 'date',
      'Дата и время': 'date',
      'Описание операции': 'description',
      'Описание': 'description',
      'Сумма операции': 'amount',
      'Сумма': 'amount',
      'Категория': 'category',
      'Контрагент': 'counterparty',
      'Валюта': 'skip',
    },
  },
  mts: {
    delimiter: ';',
    skipRows: 0,
    map: {
      'Дата операции': 'date',
      'Описание': 'description',
      'Наименование торговой точки': 'counterparty',
      'Сумма операции': 'amount',
      'Сумма в валюте счёта': 'amount',
      'Категория': 'category',
      'MCC': 'skip',
      'Валюта': 'skip',
    },
  },
}

function detectDelimiter(content: string, template: string | null): string {
  if (template && BANK_TEMPLATES[template]) return BANK_TEMPLATES[template].delimiter

  // Auto-detect: count occurrences in first line
  const firstLine = content.split('\n')[0] || ''
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length

  if (tabs > semicolons && tabs > commas) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

function getSkipRows(template: string | null): number {
  if (template && BANK_TEMPLATES[template]) return BANK_TEMPLATES[template].skipRows
  return 0
}

function autoDetectMapping(
  headers: string[],
  template: string | null,
): Record<string, string> {
  const mapping: Record<string, string> = {}

  // Use bank-specific template mapping
  if (template && BANK_TEMPLATES[template]) {
    const bankMap = BANK_TEMPLATES[template].map
    for (const h of headers) {
      mapping[h] = bankMap[h] ?? 'skip'
    }
    return mapping
  }

  // Generic auto-detect by column name keywords
  const dateKeywords = ['дата', 'date', 'время', 'time', 'when']
  const amountKeywords = ['сумма', 'amount', 'sum', 'value', 'дебет', 'кредит', 'debit', 'credit']
  const descKeywords = ['описание', 'description', 'назначение', 'наименование', 'comment', 'memo', 'операция']
  const categoryKeywords = ['категория', 'category', 'тип']
  const counterpartyKeywords = ['контрагент', 'counterparty', 'получатель', 'отправитель', 'торговая точка']

  for (const h of headers) {
    const lower = h.toLowerCase()
    if (dateKeywords.some(k => lower.includes(k))) {
      mapping[h] = 'date'
    } else if (amountKeywords.some(k => lower.includes(k))) {
      mapping[h] = 'amount'
    } else if (descKeywords.some(k => lower.includes(k))) {
      mapping[h] = 'description'
    } else if (categoryKeywords.some(k => lower.includes(k))) {
      mapping[h] = 'category'
    } else if (counterpartyKeywords.some(k => lower.includes(k))) {
      mapping[h] = 'counterparty'
    } else {
      mapping[h] = 'skip'
    }
  }

  return mapping
}
