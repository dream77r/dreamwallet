import { prisma } from '@dreamwallet/db'

const CBR_DAILY_URL = 'https://www.cbr.ru/scripts/XML_daily.asp'

interface CBRRate {
  charCode: string
  nominal: number
  value: number
}

export async function fetchCBRRates(date?: Date): Promise<CBRRate[]> {
  const d = date ?? new Date()
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  const url = `${CBR_DAILY_URL}?date_req=${dateStr}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`CBR API error: ${res.status}`)

  const xml = await res.text()
  const rates: CBRRate[] = []

  // Parse XML manually (no dependency needed)
  const valuteRegex = /<Valute[^>]*>[\s\S]*?<CharCode>(.*?)<\/CharCode>[\s\S]*?<Nominal>(.*?)<\/Nominal>[\s\S]*?<Value>(.*?)<\/Value>[\s\S]*?<\/Valute>/g
  let match
  while ((match = valuteRegex.exec(xml)) !== null) {
    rates.push({
      charCode: match[1],
      nominal: parseInt(match[2], 10),
      value: parseFloat(match[3].replace(',', '.')),
    })
  }

  return rates
}

export async function syncCBRRates(date?: Date): Promise<number> {
  const d = date ?? new Date()
  const rates = await fetchCBRRates(d)

  // Normalize date to midnight
  const rateDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  let synced = 0
  for (const rate of rates) {
    const rateToRub = rate.value / rate.nominal

    await prisma.exchangeRate.upsert({
      where: {
        fromCur_toCur_date_source: {
          fromCur: rate.charCode,
          toCur: 'RUB',
          date: rateDate,
          source: 'CBR',
        },
      },
      create: {
        fromCur: rate.charCode,
        toCur: 'RUB',
        rate: rateToRub,
        date: rateDate,
        source: 'CBR',
      },
      update: {
        rate: rateToRub,
      },
    })
    synced++
  }

  return synced
}

export async function convertAmount(
  amount: number,
  fromCur: string,
  toCur: string,
  date?: Date,
): Promise<{ converted: number; rate: number } | null> {
  if (fromCur === toCur) return { converted: amount, rate: 1 }

  const d = date ?? new Date()
  const rateDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  // Try direct rate
  let rateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCur, toCur, date: { lte: rateDate } },
    orderBy: { date: 'desc' },
  })

  if (rateRecord) {
    const rate = Number(rateRecord.rate)
    return { converted: amount * rate, rate }
  }

  // Try reverse rate
  rateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCur: toCur, toCur: fromCur, date: { lte: rateDate } },
    orderBy: { date: 'desc' },
  })

  if (rateRecord) {
    const rate = 1 / Number(rateRecord.rate)
    return { converted: amount * rate, rate }
  }

  // Try cross-rate via RUB
  if (fromCur !== 'RUB' && toCur !== 'RUB') {
    const fromToRub = await prisma.exchangeRate.findFirst({
      where: { fromCur, toCur: 'RUB', date: { lte: rateDate } },
      orderBy: { date: 'desc' },
    })
    const toToRub = await prisma.exchangeRate.findFirst({
      where: { fromCur: toCur, toCur: 'RUB', date: { lte: rateDate } },
      orderBy: { date: 'desc' },
    })

    if (fromToRub && toToRub) {
      const rate = Number(fromToRub.rate) / Number(toToRub.rate)
      return { converted: amount * rate, rate }
    }
  }

  return null
}

export async function getLatestRates(currencies: string[] = ['USD', 'EUR', 'CNY', 'GBP']): Promise<
  Array<{ currency: string; rate: number; date: string }>
> {
  const results: Array<{ currency: string; rate: number; date: string }> = []

  for (const cur of currencies) {
    const rate = await prisma.exchangeRate.findFirst({
      where: { fromCur: cur, toCur: 'RUB' },
      orderBy: { date: 'desc' },
    })
    if (rate) {
      results.push({
        currency: cur,
        rate: Number(rate.rate),
        date: rate.date.toISOString().split('T')[0],
      })
    }
  }

  return results
}
