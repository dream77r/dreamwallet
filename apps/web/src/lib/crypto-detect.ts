export type CryptoNetwork = 'ethereum' | 'bitcoin' | 'solana' | 'bsc'

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
 * Detect crypto network from wallet address.
 * - 0x... (40 hex chars) → ethereum (same format as BSC, defaulting to ethereum)
 * - bc1... / 1... / 3... → bitcoin
 * - 32-44 base58 chars → solana
 */
export function detectCryptoNetwork(address: string): CryptoNetworkInfo {
  const trimmed = address.trim()

  // Ethereum / BSC: 0x + 40 hex chars
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
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
