import type { PrismaClient } from '@dreamwallet/db'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
const ETHERSCAN_URL = 'https://api.etherscan.io/api'
const BLOCKSTREAM_URL = 'https://blockstream.info/api'
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'

// ─── Price fetching ───────────────────────────────────────────────────────────

export interface CryptoPrice {
  rub: number
  usd: number
}

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
  BNB: 'binancecoin',
}

export async function getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()]
  if (!coinId) return null

  try {
    const res = await fetch(
      `${COINGECKO_URL}?ids=${coinId}&vs_currencies=rub,usd`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, { rub: number; usd: number }>
    const entry = data[coinId]
    if (!entry) return null
    return { rub: entry.rub, usd: entry.usd }
  } catch {
    return null
  }
}

// ─── Ethereum (Etherscan) ─────────────────────────────────────────────────────

interface EtherscanTx {
  hash: string
  from: string
  to: string
  value: string      // wei
  timeStamp: string
  isError: string
  confirmations: string
}

interface EtherscanResponse {
  status: string
  result: EtherscanTx[] | string
}

async function fetchEthereumTxs(address: string): Promise<EtherscanTx[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? ''
  const url =
    `${ETHERSCAN_URL}?module=account&action=txlist` +
    `&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=50&page=1` +
    (apiKey ? `&apikey=${apiKey}` : '')

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
  const data = (await res.json()) as EtherscanResponse
  if (data.status !== '1' || !Array.isArray(data.result)) return []
  return data.result.filter((tx) => tx.isError === '0')
}

function weiToEth(wei: string): number {
  return Number(BigInt(wei)) / 1e18
}

// ─── Bitcoin (Blockstream) ────────────────────────────────────────────────────

interface BlockstreamTx {
  txid: string
  status: { confirmed: boolean; block_time?: number }
  vout: { scriptpubkey_address?: string; value: number }[]
  vin: { prevout?: { scriptpubkey_address?: string; value: number } }[]
}

async function fetchBitcoinTxs(address: string): Promise<BlockstreamTx[]> {
  const res = await fetch(`${BLOCKSTREAM_URL}/address/${address}/txs`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Blockstream HTTP ${res.status}`)
  return (await res.json()) as BlockstreamTx[]
}

function calcBtcAmount(tx: BlockstreamTx, address: string): number {
  const received = tx.vout
    .filter((v) => v.scriptpubkey_address === address)
    .reduce((s, v) => s + v.value, 0)
  const sent = tx.vin
    .filter((v) => v.prevout?.scriptpubkey_address === address)
    .reduce((s, v) => s + (v.prevout?.value ?? 0), 0)
  return (received - sent) / 1e8  // satoshi → BTC
}

// ─── Solana (public RPC) ──────────────────────────────────────────────────────

interface SolanaSignature {
  signature: string
  blockTime: number | null
}

interface SolanaAccountKeys {
  pubkey: string
}

interface SolanaTransaction {
  blockTime: number | null
  meta: {
    err: unknown | null
    preBalances: number[]
    postBalances: number[]
  } | null
  transaction: {
    message: {
      accountKeys: SolanaAccountKeys[] | string[]
    }
  }
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SOLANA_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Solana RPC HTTP ${res.status}`)
  const json = (await res.json()) as { result: T }
  return json.result
}

async function fetchSolanaTxs(
  address: string,
): Promise<Array<{ hash: string; date: Date; amount: number }>> {
  const sigs = await solanaRpc<SolanaSignature[]>('getSignaturesForAddress', [
    address,
    { limit: 50 },
  ])

  const results: Array<{ hash: string; date: Date; amount: number }> = []

  for (const sig of sigs.slice(0, 20)) {
    try {
      const tx = await solanaRpc<SolanaTransaction | null>('getTransaction', [
        sig.signature,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
      ])
      if (!tx || tx.meta?.err) continue

      const keys = tx.transaction.message.accountKeys.map((k) =>
        typeof k === 'string' ? k : k.pubkey,
      )
      const idx = keys.indexOf(address)
      if (idx === -1) continue

      const pre = tx.meta?.preBalances[idx] ?? 0
      const post = tx.meta?.postBalances[idx] ?? 0
      const amount = (post - pre) / 1e9  // lamports → SOL

      results.push({
        hash: sig.signature,
        date: sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(),
        amount,
      })
    } catch {
      // skip individual tx errors
    }
  }

  return results
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface SyncResult {
  added: number
  skipped: number
  newBalance: number
  error?: string
}

export async function syncCryptoAccount(
  accountId: string,
  prisma: PrismaClient,
): Promise<SyncResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId } })
  if (!account) throw new Error('Account not found')
  if (!account.cryptoAddress || !account.cryptoNetwork || !account.cryptoSymbol) {
    throw new Error('Account is not a crypto account')
  }

  const { cryptoAddress: address, cryptoNetwork: network, cryptoSymbol: symbol } = account

  let added = 0
  let skipped = 0
  let cryptoBalance = 0

  try {
    if (network === 'ethereum') {
      const txs = await fetchEthereumTxs(address)
      for (const tx of txs) {
        const existing = await prisma.transaction.findFirst({
          where: { accountId, reference: tx.hash },
        })
        if (existing) { skipped++; continue }

        const amount = weiToEth(tx.value)
        const isIncoming = tx.to.toLowerCase() === address.toLowerCase()

        await prisma.transaction.create({
          data: {
            accountId,
            type: isIncoming ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(amount),
            currency: 'ETH',
            date: new Date(Number(tx.timeStamp) * 1000),
            description: isIncoming
              ? `Получено от ${tx.from.slice(0, 8)}...`
              : `Отправлено на ${tx.to.slice(0, 8)}...`,
            reference: tx.hash,
            source: 'API',
          },
        })
        added++
      }

      // Recalculate ETH balance from Etherscan balance endpoint
      try {
        const apiKey = process.env.ETHERSCAN_API_KEY ?? ''
        const balUrl =
          `${ETHERSCAN_URL}?module=account&action=balance&address=${address}&tag=latest` +
          (apiKey ? `&apikey=${apiKey}` : '')
        const balRes = await fetch(balUrl, { signal: AbortSignal.timeout(10_000) })
        if (balRes.ok) {
          const balData = (await balRes.json()) as { status: string; result: string }
          if (balData.status === '1') {
            cryptoBalance = weiToEth(balData.result)
          }
        }
      } catch { /* use 0 */ }

    } else if (network === 'bitcoin') {
      const txs = await fetchBitcoinTxs(address)
      for (const tx of txs) {
        const existing = await prisma.transaction.findFirst({
          where: { accountId, reference: tx.txid },
        })
        if (existing) { skipped++; continue }

        const amount = calcBtcAmount(tx, address)
        await prisma.transaction.create({
          data: {
            accountId,
            type: amount >= 0 ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(amount),
            currency: 'BTC',
            date: tx.status.block_time ? new Date(tx.status.block_time * 1000) : new Date(),
            description: amount >= 0 ? 'Bitcoin получен' : 'Bitcoin отправлен',
            reference: tx.txid,
            source: 'API',
          },
        })
        added++
      }

      // Balance from Blockstream
      try {
        const res = await fetch(`${BLOCKSTREAM_URL}/address/${address}`, {
          signal: AbortSignal.timeout(10_000),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            chain_stats: { funded_txo_sum: number; spent_txo_sum: number }
          }
          cryptoBalance =
            (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8
        }
      } catch { /* use 0 */ }

    } else if (network === 'solana') {
      const txs = await fetchSolanaTxs(address)
      for (const tx of txs) {
        const existing = await prisma.transaction.findFirst({
          where: { accountId, reference: tx.hash },
        })
        if (existing) { skipped++; continue }

        await prisma.transaction.create({
          data: {
            accountId,
            type: tx.amount >= 0 ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(tx.amount),
            currency: 'SOL',
            date: tx.date,
            description: tx.amount >= 0 ? 'SOL получен' : 'SOL отправлен',
            reference: tx.hash,
            source: 'API',
          },
        })
        added++
      }

      // SOL balance
      try {
        const lamports = await solanaRpc<{ value: number }>('getBalance', [
          address,
          { commitment: 'confirmed' },
        ])
        cryptoBalance = lamports.value / 1e9
      } catch { /* use 0 */ }
    }

    // Update account balance in RUB
    const price = await getCryptoPrice(symbol)
    const balanceRub = price ? cryptoBalance * price.rub : 0

    await prisma.account.update({
      where: { id: accountId },
      data: {
        balance: balanceRub,
        lastSyncAt: new Date(),
      },
    })

    return { added, skipped, newBalance: balanceRub }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    // Still update lastSyncAt to avoid hammering a broken API
    await prisma.account.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    })
    return { added, skipped, newBalance: 0, error: message }
  }
}
