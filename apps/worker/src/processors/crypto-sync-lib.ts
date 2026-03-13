/**
 * Standalone crypto sync functions for the worker.
 * Duplicates core logic from apps/web/src/lib/crypto-sync.ts
 * to avoid importing Next.js-specific modules.
 */
import type { PrismaClient } from '@dreamwallet/db'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
const BLOCKSTREAM_URL = 'https://blockstream.info/api'
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'

// ─── CoinGecko ───────────────────────────────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum', BTC: 'bitcoin', SOL: 'solana',
  BNB: 'binancecoin', POL: 'matic-network',
  TON: 'the-open-network', TRX: 'tron',
}

async function getCryptoPrice(symbol: string): Promise<{ rub: number; usd: number } | null> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()]
  if (!coinId) return null
  try {
    const res = await fetch(`${COINGECKO_URL}?ids=${coinId}&vs_currencies=rub,usd`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, { rub: number; usd: number }>
    return data[coinId] ?? null
  } catch { return null }
}

// ─── EVM (Etherscan-compatible) ──────────────────────────────────────────────

const EVM_EXPLORERS: Record<string, { url: string; envKey: string }> = {
  ethereum: { url: 'https://api.etherscan.io/api', envKey: 'ETHERSCAN_API_KEY' },
  polygon: { url: 'https://api.polygonscan.com/api', envKey: 'POLYGONSCAN_API_KEY' },
  arbitrum: { url: 'https://api.arbiscan.io/api', envKey: 'ARBISCAN_API_KEY' },
  bsc: { url: 'https://api.bscscan.com/api', envKey: 'BSCSCAN_API_KEY' },
}

const NETWORK_SYMBOLS: Record<string, string> = {
  ethereum: 'ETH', polygon: 'POL', arbitrum: 'ETH', bsc: 'BNB',
}

interface EtherscanTx { hash: string; from: string; to: string; value: string; timeStamp: string; isError: string }
interface EtherscanResp { status: string; result: EtherscanTx[] | string }

function weiToEth(wei: string): number { return Number(BigInt(wei)) / 1e18 }

async function fetchEvmTxs(network: string, address: string) {
  const explorer = EVM_EXPLORERS[network]
  if (!explorer) return []
  const apiKey = process.env[explorer.envKey] ?? ''
  const url = `${explorer.url}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=50&page=1${apiKey ? `&apikey=${apiKey}` : ''}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return []
  const data = (await res.json()) as EtherscanResp
  if (data.status !== '1' || !Array.isArray(data.result)) return []
  return data.result.filter(tx => tx.isError === '0')
}

async function fetchEvmBalance(network: string, address: string) {
  const explorer = EVM_EXPLORERS[network]
  if (!explorer) return 0
  const apiKey = process.env[explorer.envKey] ?? ''
  const url = `${explorer.url}?module=account&action=balance&address=${address}&tag=latest${apiKey ? `&apikey=${apiKey}` : ''}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return 0
  const data = (await res.json()) as { status: string; result: string }
  return data.status === '1' ? weiToEth(data.result) : 0
}

// ─── Bitcoin ─────────────────────────────────────────────────────────────────

interface BtcTx { txid: string; status: { block_time?: number }; vout: { scriptpubkey_address?: string; value: number }[]; vin: { prevout?: { scriptpubkey_address?: string; value: number } }[] }

async function fetchBtcTxs(address: string) {
  const res = await fetch(`${BLOCKSTREAM_URL}/address/${address}/txs`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return []
  return (await res.json()) as BtcTx[]
}

function calcBtcAmount(tx: BtcTx, address: string) {
  const received = tx.vout.filter(v => v.scriptpubkey_address === address).reduce((s, v) => s + v.value, 0)
  const sent = tx.vin.filter(v => v.prevout?.scriptpubkey_address === address).reduce((s, v) => s + (v.prevout?.value ?? 0), 0)
  return (received - sent) / 1e8
}

// ─── Solana ──────────────────────────────────────────────────────────────────

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SOLANA_RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Solana RPC HTTP ${res.status}`)
  return ((await res.json()) as { result: T }).result
}

async function fetchSolanaTxs(address: string) {
  const sigs = await solanaRpc<Array<{ signature: string; blockTime: number | null }>>('getSignaturesForAddress', [address, { limit: 50 }])
  const results: Array<{ hash: string; date: Date; amount: number }> = []
  for (const sig of sigs.slice(0, 20)) {
    try {
      const tx = await solanaRpc<any>('getTransaction', [sig.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }])
      if (!tx || tx.meta?.err) continue
      const keys = tx.transaction.message.accountKeys.map((k: any) => typeof k === 'string' ? k : k.pubkey)
      const idx = keys.indexOf(address)
      if (idx === -1) continue
      const amount = ((tx.meta?.postBalances[idx] ?? 0) - (tx.meta?.preBalances[idx] ?? 0)) / 1e9
      results.push({ hash: sig.signature, date: sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(), amount })
    } catch { /* skip */ }
  }
  return results
}

// ─── TON ─────────────────────────────────────────────────────────────────────

async function fetchTonTxs(address: string) {
  const apiKey = process.env.TONCENTER_API_KEY ?? ''
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-API-Key'] = apiKey
  const res = await fetch(`https://toncenter.com/api/v3/transactions?account=${address}&limit=50&sort=desc`, { headers, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return []
  const data = (await res.json()) as { transactions: Array<{ hash: string; now: number; in_msg?: { value: string; source: string }; out_msgs?: Array<{ value: string; destination: string }> }> }
  return (data.transactions || []).map(tx => {
    const inVal = tx.in_msg?.value ? Number(tx.in_msg.value) / 1e9 : 0
    const outVal = (tx.out_msgs || []).reduce((s, m) => s + Number(m.value || '0') / 1e9, 0)
    const isIncoming = inVal > outVal
    return { hash: tx.hash, date: new Date(tx.now * 1000), amount: isIncoming ? inVal : outVal, isIncoming, cp: isIncoming ? (tx.in_msg?.source || '').slice(0, 8) : (tx.out_msgs?.[0]?.destination || '').slice(0, 8) }
  }).filter(t => t.amount > 0)
}

async function fetchTonBalance(address: string) {
  const apiKey = process.env.TONCENTER_API_KEY ?? ''
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-API-Key'] = apiKey
  const res = await fetch(`https://toncenter.com/api/v3/account?address=${address}`, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return 0
  const data = (await res.json()) as { balance: string }
  return Number(data.balance || '0') / 1e9
}

// ─── TRON ────────────────────────────────────────────────────────────────────

async function fetchTronTxs(address: string) {
  const apiKey = process.env.TRONGRID_API_KEY ?? ''
  const headers: Record<string, string> = {}
  if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=50&order_by=block_timestamp,desc`, { headers, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return []
  const data = (await res.json()) as { data: Array<{ txID: string; block_timestamp: number; raw_data: { contract: Array<{ parameter: { value: { amount?: number; owner_address: string; to_address?: string } }; type: string }> }; ret: Array<{ contractRet: string }> }> }
  return (data.data || []).filter(tx => tx.ret?.[0]?.contractRet === 'SUCCESS').map(tx => {
    const c = tx.raw_data.contract[0]
    if (!c || c.type !== 'TransferContract') return null
    const amount = (c.parameter.value.amount || 0) / 1e6
    const isIncoming = (c.parameter.value.to_address || '').toLowerCase() === address.toLowerCase()
    return { hash: tx.txID, date: new Date(tx.block_timestamp), amount, isIncoming, cp: isIncoming ? c.parameter.value.owner_address.slice(0, 8) : (c.parameter.value.to_address || '').slice(0, 8) }
  }).filter((t): t is NonNullable<typeof t> => t !== null && t.amount > 0)
}

async function fetchTronBalance(address: string) {
  const apiKey = process.env.TRONGRID_API_KEY ?? ''
  const headers: Record<string, string> = {}
  if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return 0
  const data = (await res.json()) as { data: Array<{ balance: number }> }
  return (data.data?.[0]?.balance || 0) / 1e6
}

// ─── Main sync ───────────────────────────────────────────────────────────────

const EVM_SET = new Set(['ethereum', 'polygon', 'arbitrum', 'bsc'])

export async function syncCryptoAccount(accountId: string, prisma: PrismaClient) {
  const account = await prisma.account.findUnique({ where: { id: accountId } })
  if (!account?.cryptoAddress || !account.cryptoNetwork || !account.cryptoSymbol) {
    throw new Error('Not a crypto account')
  }

  const { cryptoAddress: addr, cryptoNetwork: net, cryptoSymbol: sym } = account
  let added = 0, skipped = 0, balance = 0

  try {
    if (EVM_SET.has(net)) {
      const txs = await fetchEvmTxs(net, addr)
      const nSym = NETWORK_SYMBOLS[net] || 'ETH'
      for (const tx of txs) {
        if (await prisma.transaction.findFirst({ where: { accountId, reference: tx.hash } })) { skipped++; continue }
        const amt = weiToEth(tx.value)
        const incoming = tx.to.toLowerCase() === addr.toLowerCase()
        await prisma.transaction.create({ data: { accountId, type: incoming ? 'INCOME' : 'EXPENSE', amount: Math.abs(amt), currency: nSym, date: new Date(Number(tx.timeStamp) * 1000), description: incoming ? `Получено от ${tx.from.slice(0, 8)}...` : `Отправлено на ${tx.to.slice(0, 8)}...`, reference: tx.hash, source: 'API' } })
        added++
      }
      try { balance = await fetchEvmBalance(net, addr) } catch { /* 0 */ }
    } else if (net === 'bitcoin') {
      const txs = await fetchBtcTxs(addr)
      for (const tx of txs) {
        if (await prisma.transaction.findFirst({ where: { accountId, reference: tx.txid } })) { skipped++; continue }
        const amt = calcBtcAmount(tx, addr)
        await prisma.transaction.create({ data: { accountId, type: amt >= 0 ? 'INCOME' : 'EXPENSE', amount: Math.abs(amt), currency: 'BTC', date: tx.status.block_time ? new Date(tx.status.block_time * 1000) : new Date(), description: amt >= 0 ? 'Bitcoin получен' : 'Bitcoin отправлен', reference: tx.txid, source: 'API' } })
        added++
      }
      try { const r = await fetch(`${BLOCKSTREAM_URL}/address/${addr}`, { signal: AbortSignal.timeout(10_000) }); if (r.ok) { const d = (await r.json()) as any; balance = (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8 } } catch { /* 0 */ }
    } else if (net === 'solana') {
      const txs = await fetchSolanaTxs(addr)
      for (const tx of txs) {
        if (await prisma.transaction.findFirst({ where: { accountId, reference: tx.hash } })) { skipped++; continue }
        await prisma.transaction.create({ data: { accountId, type: tx.amount >= 0 ? 'INCOME' : 'EXPENSE', amount: Math.abs(tx.amount), currency: 'SOL', date: tx.date, description: tx.amount >= 0 ? 'SOL получен' : 'SOL отправлен', reference: tx.hash, source: 'API' } })
        added++
      }
      try { const r = await solanaRpc<{ value: number }>('getBalance', [addr, { commitment: 'confirmed' }]); balance = r.value / 1e9 } catch { /* 0 */ }
    } else if (net === 'ton') {
      const txs = await fetchTonTxs(addr)
      for (const tx of txs) {
        if (await prisma.transaction.findFirst({ where: { accountId, reference: tx.hash } })) { skipped++; continue }
        await prisma.transaction.create({ data: { accountId, type: tx.isIncoming ? 'INCOME' : 'EXPENSE', amount: tx.amount, currency: 'TON', date: tx.date, description: tx.isIncoming ? `Получено от ${tx.cp}...` : `Отправлено на ${tx.cp}...`, reference: tx.hash, source: 'API' } })
        added++
      }
      try { balance = await fetchTonBalance(addr) } catch { /* 0 */ }
    } else if (net === 'tron') {
      const txs = await fetchTronTxs(addr)
      for (const tx of txs) {
        if (await prisma.transaction.findFirst({ where: { accountId, reference: tx.hash } })) { skipped++; continue }
        await prisma.transaction.create({ data: { accountId, type: tx.isIncoming ? 'INCOME' : 'EXPENSE', amount: tx.amount, currency: 'TRX', date: tx.date, description: tx.isIncoming ? `Получено от ${tx.cp}...` : `Отправлено на ${tx.cp}...`, reference: tx.hash, source: 'API' } })
        added++
      }
      try { balance = await fetchTronBalance(addr) } catch { /* 0 */ }
    }

    const price = await getCryptoPrice(sym)
    const balRub = price ? balance * price.rub : 0
    await prisma.account.update({ where: { id: accountId }, data: { balance: balRub, lastSyncAt: new Date() } })
    return { added, skipped, newBalance: balRub }
  } catch (err) {
    await prisma.account.update({ where: { id: accountId }, data: { lastSyncAt: new Date() } })
    return { added, skipped, newBalance: 0, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
