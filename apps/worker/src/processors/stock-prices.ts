import type { Processor } from 'bullmq'
import pino from 'pino'
import { prisma } from '@dreamwallet/db'

const logger = pino({ name: 'stock-prices' })

const MOEX_BASE = 'https://iss.moex.com/iss'

export const stockPricesProcessor: Processor = async () => {
  logger.info('Syncing stock prices...')

  try {
    // Get all unique tickers from positions
    const positions = await prisma.investmentPosition.findMany({
      select: { ticker: true },
      distinct: ['ticker'],
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const { ticker } of positions) {
      try {
        const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${ticker}.json?iss.meta=off`
        const res = await fetch(url)
        if (!res.ok) continue

        const data = await res.json()
        const marketData = data.marketdata?.data?.[0]
        const cols = data.marketdata?.columns as string[]
        const lastIdx = cols?.indexOf('LAST')

        if (!marketData || lastIdx === undefined || lastIdx < 0) continue
        const price = marketData[lastIdx]
        if (!price || price <= 0) continue

        await prisma.stockPrice.upsert({
          where: { ticker_date: { ticker, date: today } },
          create: { ticker, price, date: today },
          update: { price },
        })

        logger.info({ ticker, price }, 'Price updated')
      } catch (err) {
        logger.error({ ticker, error: err }, 'Failed to fetch price')
      }
    }

    logger.info('Stock prices sync complete')
  } catch (err) {
    logger.error(err, 'Stock prices processor failed')
    throw err
  }
}
