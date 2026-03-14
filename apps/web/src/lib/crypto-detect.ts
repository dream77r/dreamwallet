export type CryptoNetwork = 'ethereum' | 'bitcoin' | 'solana' | 'bsc' | 'polygon' | 'arbitrum' | 'ton' | 'tron'

export interface CryptoNetworkInfo {
  network: CryptoNetwork | null
  symbol: string | null
  name: string | null
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function isBase58(str: string): boolean {
  return str.split('').every((c) => BASE58_ALPHABET.includes(c))
}

/**
 * EVM-compatible networks that share the same 0x address format.
 * Use `networkHint` to disambiguate.
 */
export const EVM_NETWORKS: Record<string, { network: CryptoNetwork; symbol: string; name: string }> = {
  ethereum: { network: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  polygon: { network: 'polygon', symbol: 'POL', name: 'Polygon' },
  arbitrum: { network: 'arbitrum', symbol: 'ETH', name: 'Arbitrum' },
  bsc: { network: 'bsc', symbol: 'BNB', name: 'BNB Chain' },
}

/**
 * Detect crypto network from wallet address.
 * - 0x... (40 hex chars) → ethereum (or use networkHint for polygon/arbitrum/bsc)
 * - bc1... / 1... / 3... → bitcoin
 * - 32-44 base58 chars → solana
 * - EQ/UQ prefix (48 chars raw) → TON
 * - T + 33 base58 chars → TRON
 */
export function detectCryptoNetwork(
  address: string,
  networkHint?: CryptoNetwork,
): CryptoNetworkInfo {
  const trimmed = address.trim()

  // Ethereum / Polygon / Arbitrum / BSC: 0x + 40 hex chars
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    if (networkHint && EVM_NETWORKS[networkHint]) {
      const info = EVM_NETWORKS[networkHint]
      return { network: info.network, symbol: info.symbol, name: info.name }
    }
    return { network: 'ethereum', symbol: 'ETH', name: 'Ethereum' }
  }

  // Bitcoin bech32 (bc1...)
  if (/^bc1[a-z0-9]{6,87}$/.test(trimmed)) {
    return { network: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }
  }
  // Bitcoin legacy (starts with 1 or 3)
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) {
    return { network: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }
  }

  // TON: EQ or UQ prefix + 46 base64url chars (total 48)
  if (/^[EU]Q[A-Za-z0-9_-]{46}$/.test(trimmed)) {
    return { network: 'ton', symbol: 'TON', name: 'TON' }
  }

  // TRON: T + 33 base58 chars (total 34)
  if (/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(trimmed)) {
    return { network: 'tron', symbol: 'TRX', name: 'TRON' }
  }

  // Solana: base58, 32-44 chars (not matching bitcoin pattern)
  if (trimmed.length >= 32 && trimmed.length <= 44 && isBase58(trimmed)) {
    return { network: 'solana', symbol: 'SOL', name: 'Solana' }
  }

  return { network: null, symbol: null, name: null }
}

export function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
