/**
 * MOEX ISS API client for Russian stock market data
 */

const MOEX_BASE = 'https://iss.moex.com/iss'

export interface StockQuote {
  ticker: string
  price: number
  change: number
  changePercent: number
  currency: string
}

export interface StockHistoryPoint {
  date: string
  close: number
}

export async function fetchQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${ticker}.json?iss.meta=off`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()
    const marketData = data.marketdata?.data?.[0]
    const secData = data.securities?.data?.[0]

    if (!marketData || !secData) return null

    const cols = data.marketdata?.columns as string[]
    const secCols = data.securities?.columns as string[]

    const lastIdx = cols.indexOf('LAST')
    const changeIdx = cols.indexOf('CHANGE')
    const changePctIdx = cols.indexOf('LASTTOPREVPRICE')
    const curIdx = secCols.indexOf('CURRENCYID')

    return {
      ticker,
      price: marketData[lastIdx] ?? 0,
      change: marketData[changeIdx] ?? 0,
      changePercent: marketData[changePctIdx] ?? 0,
      currency: secData[curIdx] ?? 'SUR',
    }
  } catch {
    return null
  }
}

export async function fetchHistory(
  ticker: string,
  from: string,
  to: string,
): Promise<StockHistoryPoint[]> {
  try {
    const url = `${MOEX_BASE}/history/engines/stock/markets/shares/boards/TQBR/securities/${ticker}.json?from=${from}&till=${to}&iss.meta=off`
    const res = await fetch(url)
    if (!res.ok) return []

    const data = await res.json()
    const history = data.history?.data ?? []
    const cols = data.history?.columns as string[]

    const dateIdx = cols.indexOf('TRADEDATE')
    const closeIdx = cols.indexOf('CLOSE')

    return history.map((row: any[]) => ({
      date: row[dateIdx],
      close: row[closeIdx],
    })).filter((p: StockHistoryPoint) => p.close > 0)
  } catch {
    return []
  }
}
