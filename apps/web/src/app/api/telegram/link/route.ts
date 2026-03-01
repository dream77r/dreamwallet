import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@dreamwallet/db'
import { pendingLinks } from '@/server/routers/telegram'

export async function POST(req: NextRequest) {
  try {
    const { token, chatId, username, firstName } = await req.json() as {
      token: string
      chatId: string
      username?: string
      firstName?: string
    }

    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const entry = pendingLinks.get(token)
    if (!entry || entry.expiresAt < Date.now()) {
      return NextResponse.json({ ok: false, error: 'Token invalid or expired' }, { status: 400 })
    }

    pendingLinks.delete(token)

    await prisma.telegramConnection.upsert({
      where:  { userId: entry.userId },
      update: { chatId, username, firstName, isActive: true, linkedAt: new Date() },
      create: { userId: entry.userId, chatId, username, firstName },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram link error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
