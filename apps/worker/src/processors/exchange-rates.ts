import type { Processor } from 'bullmq'
import pino from 'pino'
import { prisma } from '@dreamwallet/db'

const logger = pino({ name: 'exchange-rates' })

const CBR_DAILY_URL = 'https://www.cbr.ru/scripts/XML_daily.asp'

export const exchangeRatesProcessor: Processor = async () => {
  logger.info('Syncing exchange rates from CBR...')

  try {
    const res = await fetch(CBR_DAILY_URL)
    if (!res.ok) throw new Error(`CBR API error: ${res.status}`)

    const xml = await res.text()
    const rateDate = new Date()
    rateDate.setHours(0, 0, 0, 0)

    const valuteRegex = /<Valute[^>]*>[\s\S]*?<CharCode>(.*?)<\/CharCode>[\s\S]*?<Nominal>(.*?)<\/Nominal>[\s\S]*?<Value>(.*?)<\/Value>[\s\S]*?<\/Valute>/g
    let match
    let synced = 0

    while ((match = valuteRegex.exec(xml)) !== null) {
      const charCode = match[1]
      const nominal = parseInt(match[2], 10)
      const value = parseFloat(match[3].replace(',', '.'))
      const rateToRub = value / nominal

      await prisma.exchangeRate.upsert({
        where: {
          fromCur_toCur_date_source: {
            fromCur: charCode,
            toCur: 'RUB',
            date: rateDate,
            source: 'CBR',
          },
        },
        create: { fromCur: charCode, toCur: 'RUB', rate: rateToRub, date: rateDate, source: 'CBR' },
        update: { rate: rateToRub },
      })
      synced++
    }

    logger.info({ synced }, 'Exchange rates synced')
  } catch (err) {
    logger.error(err, 'Failed to sync exchange rates')
    throw err
  }
}
