import type { PrismaClient } from '@dreamwallet/db'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
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
  POL: 'matic-network',
  TON: 'the-open-network',
  TRX: 'tron',
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

// ─── Etherscan-compatible API (Ethereum, Polygon, Arbitrum, BSC) ─────────────

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

const EVM_EXPLORERS: Record<string, { url: string; envKey: string }> = {
  ethereum: { url: 'https://api.etherscan.io/api', envKey: 'ETHERSCAN_API_KEY' },
  polygon: { url: 'https://api.polygonscan.com/api', envKey: 'POLYGONSCAN_API_KEY' },
  arbitrum: { url: 'https://api.arbiscan.io/api', envKey: 'ARBISCAN_API_KEY' },
  bsc: { url: 'https://api.bscscan.com/api', envKey: 'BSCSCAN_API_KEY' },
}

async function fetchEvmTxs(network: string, address: string): Promise<EtherscanTx[]> {
  const explorer = EVM_EXPLORERS[network]
  if (!explorer) throw new Error(`Unsupported EVM network: ${network}`)

  const apiKey = process.env[explorer.envKey] ?? ''
  const url =
    `${explorer.url}?module=account&action=txlist` +
    `&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=50&page=1` +
    (apiKey ? `&apikey=${apiKey}` : '')

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`${network} explorer HTTP ${res.status}`)
  const data = (await res.json()) as EtherscanResponse
  if (data.status !== '1' || !Array.isArray(data.result)) return []
  return data.result.filter((tx) => tx.isError === '0')
}

async function fetchEvmBalance(network: string, address: string): Promise<number> {
  const explorer = EVM_EXPLORERS[network]
  if (!explorer) return 0

  const apiKey = process.env[explorer.envKey] ?? ''
  const url =
    `${explorer.url}?module=account&action=balance&address=${address}&tag=latest` +
    (apiKey ? `&apikey=${apiKey}` : '')

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return 0
  const data = (await res.json()) as { status: string; result: string }
  if (data.status !== '1') return 0
  return weiToEth(data.result)
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

// ─── TON (TON Center API v3) ─────────────────────────────────────────────────

interface TonTransaction {
  hash: string
  now: number  // unix timestamp
  in_msg?: { value: string; source: string }
  out_msgs?: Array<{ value: string; destination: string }>
}

async function fetchTonTxs(address: string): Promise<Array<{ hash: string; date: Date; amount: number; isIncoming: boolean; counterparty: string }>> {
  const apiKey = process.env.TONCENTER_API_KEY ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey

  const res = await fetch(
    `https://toncenter.com/api/v3/transactions?account=${address}&limit=50&sort=desc`,
    { headers, signal: AbortSignal.timeout(15_000) },
  )
  if (!res.ok) throw new Error(`TON Center HTTP ${res.status}`)
  const data = (await res.json()) as { transactions: TonTransaction[] }

  return (data.transactions || []).map((tx) => {
    const inValue = tx.in_msg?.value ? Number(tx.in_msg.value) / 1e9 : 0
    const outValue = (tx.out_msgs || []).reduce((s, m) => s + Number(m.value || '0') / 1e9, 0)

    const isIncoming = inValue > outValue
    const amount = isIncoming ? inValue : outValue
    const counterparty = isIncoming
      ? (tx.in_msg?.source || '').slice(0, 8)
      : (tx.out_msgs?.[0]?.destination || '').slice(0, 8)

    return { hash: tx.hash, date: new Date(tx.now * 1000), amount, isIncoming, counterparty }
  }).filter((tx) => tx.amount > 0)
}

async function fetchTonBalance(address: string): Promise<number> {
  const apiKey = process.env.TONCENTER_API_KEY ?? ''
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-API-Key'] = apiKey

  const res = await fetch(
    `https://toncenter.com/api/v3/account?address=${address}`,
    { headers, signal: AbortSignal.timeout(10_000) },
  )
  if (!res.ok) return 0
  const data = (await res.json()) as { balance: string }
  return Number(data.balance || '0') / 1e9
}

// ─── TRON (TronGrid API) ─────────────────────────────────────────────────────

interface TronTx {
  txID: string
  block_timestamp: number
  raw_data: {
    contract: Array<{
      parameter: {
        value: {
          amount?: number
          owner_address: string
          to_address?: string
        }
      }
      type: string
    }>
  }
  ret: Array<{ contractRet: string }>
}

async function fetchTronTxs(address: string): Promise<Array<{ hash: string; date: Date; amount: number; isIncoming: boolean; counterparty: string }>> {
  const apiKey = process.env.TRONGRID_API_KEY ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey

  const res = await fetch(
    `https://api.trongrid.io/v1/accounts/${address}/transactions?limit=50&order_by=block_timestamp,desc`,
    { headers, signal: AbortSignal.timeout(15_000) },
  )
  if (!res.ok) throw new Error(`TronGrid HTTP ${res.status}`)
  const data = (await res.json()) as { data: TronTx[] }

  return (data.data || [])
    .filter((tx) => tx.ret?.[0]?.contractRet === 'SUCCESS')
    .map((tx) => {
      const contract = tx.raw_data.contract[0]
      if (!contract || contract.type !== 'TransferContract') return null

      const amount = (contract.parameter.value.amount || 0) / 1e6  // sun → TRX
      const toAddr = contract.parameter.value.to_address || ''
      const fromAddr = contract.parameter.value.owner_address || ''
      const isIncoming = toAddr.toLowerCase() === address.toLowerCase() ||
        toAddr === address  // TRON addresses can be hex or base58

      return {
        hash: tx.txID,
        date: new Date(tx.block_timestamp),
        amount,
        isIncoming,
        counterparty: isIncoming ? fromAddr.slice(0, 8) : toAddr.slice(0, 8),
      }
    })
    .filter((tx): tx is NonNullable<typeof tx> => tx !== null && tx.amount > 0)
}

async function fetchTronBalance(address: string): Promise<number> {
  const apiKey = process.env.TRONGRID_API_KEY ?? ''
  const headers: Record<string, string> = {}
  if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey

  const res = await fetch(
    `https://api.trongrid.io/v1/accounts/${address}`,
    { headers, signal: AbortSignal.timeout(10_000) },
  )
  if (!res.ok) return 0
  const data = (await res.json()) as { data: Array<{ balance: number }> }
  return (data.data?.[0]?.balance || 0) / 1e6
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface SyncResult {
  added: number
  skipped: number
  newBalance: number
  error?: string
}

const EVM_NETWORKS = new Set(['ethereum', 'polygon', 'arbitrum', 'bsc'])

const NETWORK_SYMBOLS: Record<string, string> = {
  ethereum: 'ETH',
  polygon: 'POL',
  arbitrum: 'ETH',
  bsc: 'BNB',
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
    if (EVM_NETWORKS.has(network)) {
      // ── EVM chains (Ethereum, Polygon, Arbitrum, BSC) ──
      const txs = await fetchEvmTxs(network, address)
      const nativeSymbol = NETWORK_SYMBOLS[network] || 'ETH'

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
            currency: nativeSymbol,
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

      try {
        cryptoBalance = await fetchEvmBalance(network, address)
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

      try {
        const lamports = await solanaRpc<{ value: number }>('getBalance', [
          address,
          { commitment: 'confirmed' },
        ])
        cryptoBalance = lamports.value / 1e9
      } catch { /* use 0 */ }

    } else if (network === 'ton') {
      const txs = await fetchTonTxs(address)
      for (const tx of txs) {
        const existing = await prisma.transaction.findFirst({
          where: { accountId, reference: tx.hash },
        })
        if (existing) { skipped++; continue }

        await prisma.transaction.create({
          data: {
            accountId,
            type: tx.isIncoming ? 'INCOME' : 'EXPENSE',
            amount: tx.amount,
            currency: 'TON',
            date: tx.date,
            description: tx.isIncoming
              ? `Получено от ${tx.counterparty}...`
              : `Отправлено на ${tx.counterparty}...`,
            reference: tx.hash,
            source: 'API',
          },
        })
        added++
      }

      try {
        cryptoBalance = await fetchTonBalance(address)
      } catch { /* use 0 */ }

    } else if (network === 'tron') {
      const txs = await fetchTronTxs(address)
      for (const tx of txs) {
        const existing = await prisma.transaction.findFirst({
          where: { accountId, reference: tx.hash },
        })
        if (existing) { skipped++; continue }

        await prisma.transaction.create({
          data: {
            accountId,
            type: tx.isIncoming ? 'INCOME' : 'EXPENSE',
            amount: tx.amount,
            currency: 'TRX',
            date: tx.date,
            description: tx.isIncoming
              ? `Получено от ${tx.counterparty}...`
              : `Отправлено на ${tx.counterparty}...`,
            reference: tx.hash,
            source: 'API',
          },
        })
        added++
      }

      try {
        cryptoBalance = await fetchTronBalance(address)
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
