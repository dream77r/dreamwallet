import { Bot, Context, session, SessionFlavor, Keyboard } from 'grammy'
import { prisma } from '@dreamwallet/db'
import { detectIntentFast } from '@dreamwallet/shared'
import { parseTransactionText, formatAmount } from './parser'
import { parseBankSMS } from './sms-parser'
import { parseScreenshot } from './screenshot-parser'
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

// ─── Intent Handler Helpers ───────────────────────────────────────────────────

async function handleShowBalance(ctx: BotContext, userId: string) {
  const wallet = await getUserWallet(userId)
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
}

async function handleShowLast(ctx: BotContext, userId: string) {
  const txs = await prisma.transaction.findMany({
    where:   { account: { wallet: { userId } } },
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
}

async function handleShowGoals(ctx: BotContext, userId: string) {
  const goals = await prisma.goal.findMany({
    where:   { userId, isCompleted: false },
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
}

async function handleShowBudgets(ctx: BotContext, userId: string) {
  const wallet = await getUserWallet(userId)
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
}

async function handleShowExpenses(ctx: BotContext, userId: string, period?: string) {
  const now = new Date()
  let dateFrom: Date
  let periodLabel: string

  const p = (period ?? '').toLowerCase()
  if (p.startsWith('сегодн')) {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    periodLabel = 'сегодня'
  } else if (p.startsWith('вчера')) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    dateFrom = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    now.setDate(now.getDate() - 1)
    periodLabel = 'вчера'
  } else if (/недел/.test(p)) {
    dateFrom = new Date(now)
    dateFrom.setDate(dateFrom.getDate() - 7)
    periodLabel = 'за неделю'
  } else if (p.startsWith('год')) {
    dateFrom = new Date(now.getFullYear(), 0, 1)
    periodLabel = 'за этот год'
  } else {
    // default: current month
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    periodLabel = 'за этот месяц'
  }

  const result = await prisma.transaction.aggregate({
    where: {
      account: { wallet: { userId } },
      type:    'EXPENSE',
      date:    { gte: dateFrom, lte: new Date() },
    },
    _sum: { amount: true },
  })

  const total = Number(result._sum.amount ?? 0)

  // Top categories
  const byCategory = await prisma.transaction.groupBy({
    by:      ['categoryId'],
    where:   { account: { wallet: { userId } }, type: 'EXPENSE', date: { gte: dateFrom, lte: new Date() } },
    _sum:    { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take:    5,
  })

  const catLines = await Promise.all(byCategory.map(async (row) => {
    const cat = row.categoryId
      ? await prisma.category.findUnique({ where: { id: row.categoryId } })
      : null
    const amt = Number(row._sum.amount ?? 0)
    return `  • ${cat?.icon ?? ''} ${cat?.name ?? 'Без категории'}: ${formatAmount(amt)}`
  }))

  const catBlock = catLines.length ? `\n\n*Топ категорий:*\n${catLines.join('\n')}` : ''

  await ctx.reply(
    `💸 *Расходы ${periodLabel}*\n\n` +
    `*Итого: ${formatAmount(total)}*` +
    catBlock,
    { parse_mode: 'Markdown' }
  )
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
    await handleShowBalance(ctx, user.id)
  })

  // ── /last — последние транзакции ──────────────────────────────────────────
  bot.command('last', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')
    await handleShowLast(ctx, user.id)
  })

  // ── /goals ────────────────────────────────────────────────────────────────
  bot.command('goals', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')
    await handleShowGoals(ctx, user.id)
  })

  // ── /budgets ──────────────────────────────────────────────────────────────
  bot.command('budgets', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('❌ Сначала привяжи аккаунт командой /start')
    await handleShowBudgets(ctx, user.id)
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

    // Intent detection — handle natural language queries before transaction parsing
    const intent = detectIntentFast(text)
    if (intent.confidence >= 0.5) {
      switch (intent.intent) {
        case 'show_balance':
          await handleShowBalance(ctx, user.id)
          return
        case 'show_last':
          await handleShowLast(ctx, user.id)
          return
        case 'show_goals':
          await handleShowGoals(ctx, user.id)
          return
        case 'show_budgets':
          await handleShowBudgets(ctx, user.id)
          return
        case 'show_expenses':
          await handleShowExpenses(ctx, user.id, intent.params.period)
          return
      }
    }

    // Try SMS parsing (forwarded bank SMS)
    const sms = parseBankSMS(text)
    if (sms) {
      await addTransaction(ctx, user.id, sms.amount, sms.type, sms.description, 'TELEGRAM_SMS')
      return
    }

    const parsed = parseTransactionText(text)
    if (!parsed) {
      return ctx.reply(
        '🤔 Не понял сумму. Попробуй так:\n' +
        '• "кофе 300"\n' +
        '• "зарплата 80000"\n' +
        '• "такси 450 рублей"\n' +
        '• Или перешли SMS из банка'
      )
    }

    await addTransaction(ctx, user.id, parsed.amount, parsed.type, parsed.description)
  })

  // ── Фото-сообщения — скриншоты банковских приложений ────────────────────
  bot.on('message:photo', async (ctx) => {
    const user = await getUser(String(ctx.chat.id))
    if (!user) return ctx.reply('👋 Привяжи аккаунт DreamWallet, нажав /start')

    const thinking = await ctx.reply('📸 Распознаю скриншот...')

    try {
      // Get largest photo
      const photos = ctx.message.photo
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
      const tgRes = await fetch(fileUrl)
      const buffer = Buffer.from(await tgRes.arrayBuffer())
      const base64 = buffer.toString('base64')

      const result = await parseScreenshot(base64)

      await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => {})

      if (!result) {
        return ctx.reply('🤔 Не удалось распознать финансовую информацию на скриншоте')
      }

      await addTransaction(ctx, user.id, result.amount, result.type, result.description, 'TELEGRAM_SCREENSHOT')

    } catch (err) {
      logger.error(err, 'Screenshot processing failed')
      await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => {})
      await ctx.reply('❌ Ошибка при распознавании скриншота')
    }
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

      // Intent detection on transcribed voice text
      const intent = detectIntentFast(text)
      if (intent.confidence >= 0.5) {
        await ctx.reply(`🎙️ _"${text}"_`, { parse_mode: 'Markdown' })
        switch (intent.intent) {
          case 'show_balance':
            await handleShowBalance(ctx, user.id)
            return
          case 'show_last':
            await handleShowLast(ctx, user.id)
            return
          case 'show_goals':
            await handleShowGoals(ctx, user.id)
            return
          case 'show_budgets':
            await handleShowBudgets(ctx, user.id)
            return
          case 'show_expenses':
            await handleShowExpenses(ctx, user.id, intent.params.period)
            return
        }
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
  source: 'MANUAL' | 'TELEGRAM_SMS' | 'TELEGRAM_SCREENSHOT' = 'MANUAL',
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
        source,
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
