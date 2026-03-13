import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@dreamwallet/db'
import { validateInitData } from '@/lib/telegram-auth'
import { createTgToken } from '@/lib/telegram-jwt'

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json() as { initData?: string }
    if (!initData) {
      return NextResponse.json({ error: 'initData required' }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
    }

    const tgUser = validateInitData(initData, botToken)
    if (!tgUser) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 })
    }

    const connection = await prisma.telegramConnection.findUnique({
      where: { chatId: String(tgUser.id) },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!connection || !connection.isActive) {
      return NextResponse.json({ error: 'Account not linked' }, { status: 403 })
    }

    const token = createTgToken(connection.user.id)

    return NextResponse.json({
      token,
      user: {
        id: connection.user.id,
        name: connection.user.name,
      },
    })
  } catch (err) {
    console.error('Telegram auth error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
