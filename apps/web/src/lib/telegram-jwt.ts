import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

const JWT_EXPIRY = 24 * 60 * 60 // 24h in seconds

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString()
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createTgToken(userId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET not set')

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
  }))

  const signature = sign(`${header}.${payload}`, secret)
  return `${header}.${payload}.${signature}`
}

export function verifyTgToken(req: NextRequest): string | null {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) return null

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, sig] = parts
  const expected = sign(`${header}.${payload}`, secret)
  if (sig !== expected) return null

  try {
    const data = JSON.parse(base64urlDecode(payload)) as { sub?: string; exp?: number }
    if (!data.sub || !data.exp) return null
    if (data.exp < Math.floor(Date.now() / 1000)) return null
    return data.sub
  } catch {
    return null
  }
}
