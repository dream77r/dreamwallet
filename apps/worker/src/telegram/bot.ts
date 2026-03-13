import { Bot, Context, session, SessionFlavor, Keyboard } from 'grammy'
import { prisma } from '@dreamwallet/db'
import { parseTransactionText, formatAmount } from './parser'
import pino from 'pino'

const logger = pino({ name: 'telegram-bot' })

// ─── Session ─────────────────────────────────────────────────────────────────

interface SessionData {
  waitingForAmount?: { description: string; type: 'INCOME' | 'EXPENSE' }
  lastTransactionId?: string
}

type BotContext = Context & SessionFlavor<SessionData>

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getUser(chatId: string) {
  const conn = await prisma.telegramConnection.findUnique({
    where:   { chatId: String(chatId) },
    include: { user: true },
  })
  return conn?.user ?? null
}

async function getUserWallet(userId: string) {
  return prisma.wallet.findFirst({
    where:   { userId, type: 'PERSONAL' },
    include: { accounts: { where: { isArchived: false }, take: 1 } },
  })
}

async function applyAutoRules(userId: string, description: string) {
  const rules = await prisma.autoCategoryRule.findMany({
    where:   { userId, isActive: true },
    orderBy: [{ priority: 'desc' }],
  })
  for (const rule of rules) {
    const matches = rule.isRegex
      ? new RegExp(rule.pattern, 'i').test(description)
      : description.toLowerCase().includes(rule.pattern.toLowerCase())
    if (matches) return rule.categoryId
  }
  return null
}

// ─── Bot Setup ────────────────────────────────────────────────────────────────

export function createBot(token: string) {
  const bot = new Bot<BotContext>(token)

  bot.use(session({ initial: (): SessionData => ({}) }))

  // Set Menu Button for Web App
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dreamwallet.brewos.ru'
  bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'DreamWallet',
      web_app: { url: `${appUrl}/tg` },
    },
  }).catch(err => logger.warn(err, 'Failed to set menu button'))

  // ── /start <token> — привязка аккаунта ───────────────────────────────────
  bot.command('start', async (ctx) => {
    const linkToken = ctx.match?.trim()
    const chatId    = String(ctx.chat.id)

    if (!linkToken) {
      // Проверить уже ли привязан
      const existing = await prisma.telegramConnection.findUnique({ where: { chatId } })
      if (existing) {
        await ctx.reply(
          '✅ Твой аккаунт уже привязан!\n\n' +
          'Просто пиши мне транзакции:\n' +
          '• "кофе 300" — добавить расход\n' +
          '• "зарплата 80000" — добавить доход\n' +
          '• /balance — текущий баланс\n' +
          '• /last — последние транзакции\n' +
          '• /goals — финансовые цели\n' +
          '• /budgets — бюджеты',
        )
      } else {
        await ctx.reply(
          '👋 Привет! Я DreamWallet бот.\n\n' +
          'Чтобы начать, открой настройки в приложении и нажми «Подключить Telegram».\n' +
          'Ты получишь ссылку — просто перейди по ней!',
        )
      }
      return
    }

    // Проверяем токен привязки через API
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/link`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          token:     linkToken,
          chatId,
          username:  ctx.from?.username,
          firstName: ctx.from?.first_name,
        }),
      })

      const data = await resp.json() as { ok: boolean; error?: string }

      if (!resp.ok || !data.ok) {
        await ctx.reply('❌ Ссылка недействительна или истекла. Получи новую в настройках приложения.')
        return
      }

      const keyboard = new Keyboard()
        .webApp('Открыть DreamWallet', `${appUrl}/tg`)
        .resized()

      await ctx.reply(
        `✅ Отлично, ${ctx.from?.first_name ?? 'друг'}! Аккаунт DreamWallet привязан.\n\n` +
        'Теперь ты можешь:\n' +
        '• Писать транзакции текстом: "кофе 300", "зарплата 80к"\n' +
        '• 🎙️ Отправлять голосовые сообщения\n' +
        '• Проверять /balance, /last, /goals\n' +
        '• 📱 Открыть мини-приложение через кнопку ниже\n\n' +
        'Попробуй прямо сейчас — напиши что-нибудь!',
        { reply_markup: keyboard },
      )
    } catch (err) {
      logger.error(err, 'Link failed')
      await ctx.reply('❌ Ошибка привязки. Попробуй ещё раз.')
    }
  })

  // ── /balance ──────────────────────────────────────────────────────────────
  bot.command('balance', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')

    const wallet = await getUserWallet(user.id)
    if (!wallet) return ctx.reply('❌ Кошелёк не найден')

    const accounts = await prisma.account.findMany({
      where: { walletId: wallet.id, isArchived: false },
    })

    if (!accounts.length) return ctx.reply('Нет счетов. Добавь первый счёт в приложении.')

    const total = accounts.reduce((s, a) => s + Number(a.balance), 0)
    const lines = accounts.map((a) => `  • ${a.name}: ${formatAmount(Number(a.balance), a.currency)}`).join('\n')

    await ctx.reply(
      `💰 *Баланс*\n\n${lines}\n\n` +
      `*Итого: ${formatAmount(total, wallet.currency)}*`,
      { parse_mode: 'Markdown' }
    )
  })

  // ── /last — последние транзакции ──────────────────────────────────────────
  bot.command('last', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')

    const txs = await prisma.transaction.findMany({
      where:   { account: { wallet: { userId: user.id } } },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      take:    7,
    })

    if (!txs.length) return ctx.reply('Транзакций пока нет. Добавь первую!')

    const lines = txs.map((tx) => {
      const sign   = tx.type === 'INCOME' ? '+' : '-'
      const emoji  = tx.type === 'INCOME' ? '🟢' : '🔴'
      const cat    = tx.category?.name ?? 'Без категории'
      const amount = formatAmount(Number(tx.amount), tx.currency)
      const date   = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      return `${emoji} ${sign}${amount} — ${tx.description || cat} (${date})`
    })

    await ctx.reply(`📋 *Последние транзакции*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' })
  })

  // ── /goals ────────────────────────────────────────────────────────────────
  bot.command('goals', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')

    const goals = await prisma.goal.findMany({
      where:   { userId: user.id, isCompleted: false },
      orderBy: { createdAt: 'desc' },
    })

    if (!goals.length) return ctx.reply('Целей пока нет. Добавь первую в приложении! 🎯')

    const lines = goals.map((g) => {
      const cur = Number(g.currentAmount)
      const tgt = Number(g.targetAmount)
      const pct = Math.min(100, Math.round((cur / tgt) * 100))
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
      return `${g.icon ?? '🎯'} *${g.name}*\n${bar} ${pct}%\n${formatAmount(cur)} из ${formatAmount(tgt)}`
    })

    await ctx.reply(`🎯 *Финансовые цели*\n\n${lines.join('\n\n')}`, { parse_mode: 'Markdown' })
  })

  // ── /budgets ──────────────────────────────────────────────────────────────
  bot.command('budgets', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')

    const wallet = await getUserWallet(user.id)
    if (!wallet) return ctx.reply('Кошелёк не найден')

    const budgets = await prisma.budget.findMany({
      where:   { walletId: wallet.id, isActive: true },
      include: { category: true },
    })

    if (!budgets.length) return ctx.reply('Бюджеты не настроены.')

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const lines = await Promise.all(budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: { account: { walletId: wallet.id }, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
        _sum:  { amount: true },
      })
      const spentAmt = Number(spent._sum.amount ?? 0)
      const limit    = Number(b.amount)
      const pct      = Math.min(100, Math.round((spentAmt / limit) * 100))
      const emoji    = pct > 100 ? '🔴' : pct >= 85 ? '🟡' : '🟢'
      return `${emoji} ${b.category.icon ?? ''} *${b.category.name}*: ${formatAmount(spentAmt)} из ${formatAmount(limit)} (${pct}%)`
    }))

    await ctx.reply(`📊 *Бюджеты этого месяца*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' })
  })

  // ── /help ─────────────────────────────────────────────────────────────────
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '💡 *Что умеет DreamWallet бот*\n\n' +
      '*Добавить транзакцию текстом:*\n' +
      '  • "кофе 300"\n' +
      '  • "такси за 450 рублей"\n' +
      '  • "зарплата 80000"\n' +
      '  • "потратил 1500 в ресторане"\n\n' +
      '🎙️ *Голосовое сообщение* — скажи что потратил, я распознаю и добавлю\n\n' +
      '*Команды:*\n' +
      '/balance — текущий баланс\n' +
      '/last — последние 7 транзакций\n' +
      '/goals — финансовые цели\n' +
      '/budgets — бюджеты месяца\n' +
      '/help — эта подсказка',
      { parse_mode: 'Markdown' }
    )
  })

  // ── Текстовые сообщения — добавление транзакций ───────────────────────────
  bot.on('message:text', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) {
      return ctx.reply('👋 Привяжи аккаунт DreamWallet, нажав /start')
    }

    const text = ctx.message.text
    if (text.startsWith('/')) return // другие команды

    const parsed = parseTransactionText(text)
    if (!parsed) {
      return ctx.reply(
        '🤔 Не понял сумму. Попробуй так:\n' +
        '• "кофе 300"\n' +
        '• "зарплата 80000"\n' +
        '• "такси 450 рублей"'
      )
    }

    await addTransaction(ctx, user.id, parsed.amount, parsed.type, parsed.description)
  })

  // ── Голосовые сообщения ───────────────────────────────────────────────────
  bot.on('message:voice', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('👋 Привяжи аккаунт DreamWallet, нажав /start')

    const deepgramKey = process.env.DEEPGRAM_API_KEY
    if (!deepgramKey) {
      return ctx.reply('⚠️ Голосовые сообщения временно недоступны')
    }

    const thinking = await ctx.reply('🎙️ Распознаю...')

    try {
      // Скачиваем голосовой файл из Telegram
      const file    = await ctx.getFile()
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
      const tgRes   = await fetch(fileUrl)
      const buffer  = Buffer.from(await tgRes.arrayBuffer())

      // Отправляем в DeepGram Nova-2
      const dgRes = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&language=ru&smart_format=true&punctuate=true',
        {
          method:  'POST',
          headers: {
            'Authorization': `Token ${deepgramKey}`,
            'Content-Type':  'audio/ogg',
          },
          body: buffer,
        },
      )

      if (!dgRes.ok) {
        throw new Error(`DeepGram error: ${dgRes.status}`)
      }

      const dgData = await dgRes.json() as {
        results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> }
      }
      const text = (dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '').trim()
      logger.info({ text }, 'Voice transcribed')

      // Удаляем "распознаю"
      await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id)

      if (!text) {
        return ctx.reply('😕 Не удалось распознать речь')
      }

      // Сообщаем что распознали
      const parsed = parseTransactionText(text)
      if (!parsed) {
        return ctx.reply(`🎙️ Распознал: _"${text}"_\n\n🤔 Не понял сумму. Уточни!`, { parse_mode: 'Markdown' })
      }

      await ctx.reply(`🎙️ _"${text}"_`, { parse_mode: 'Markdown' })
      await addTransaction(ctx, user.id, parsed.amount, parsed.type, parsed.description)

    } catch (err) {
      logger.error(err, 'Voice processing failed')
      await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => {})
      await ctx.reply('❌ Ошибка при распознавании голоса')
    }
  })

  return bot
}

// ─── Добавление транзакции ───────────────────────────────────────────────────

async function addTransaction(
  ctx: BotContext,
  userId: string,
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  description: string,
) {
  const wallet = await getUserWallet(userId)
  if (!wallet || !wallet.accounts.length) {
    return ctx.reply('❌ Нет счетов. Добавь счёт в приложении.')
  }

  const account    = wallet.accounts[0]
  const categoryId = await applyAutoRules(userId, description)
  const category   = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId } })
    : null

  const multiplier = type === 'INCOME' ? 1 : -1

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId:   account.id,
        type,
        amount,
        currency:    account.currency,
        date:        new Date(),
        description,
        categoryId:  categoryId ?? undefined,
        source:      'MANUAL',
      },
    }),
    prisma.account.update({
      where: { id: account.id },
      data:  { balance: { increment: amount * multiplier } },
    }),
  ])

  const emoji = type === 'INCOME' ? '🟢' : '🔴'
  const sign  = type === 'INCOME' ? '+' : '-'
  const catStr = category ? ` → ${category.icon ?? ''} ${category.name}` : ''

  await ctx.reply(
    `${emoji} *${sign}${formatAmount(amount, account.currency)}*${catStr}\n` +
    `📝 ${description}\n` +
    `💳 ${account.name}`,
    { parse_mode: 'Markdown' }
  )
}
