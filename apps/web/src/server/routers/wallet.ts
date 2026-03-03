import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const walletRouter = router({
  // Get personal wallet with accounts
  get: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findUnique({
      where: { userId: ctx.user.id },
      include: {
        accounts: {
          where: { isArchived: false },
          orderBy: { sortOrder: 'asc' },
        },
        budgets: {
          where: { isActive: true },
          include: { category: true },
        },
      },
    })

    if (!wallet) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Кошелёк не найден' })
    }

    return wallet
  }),

  // Get stats for wallet dashboard
  getStats: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

      const from = input.dateFrom || monthStart
      const to = input.dateTo || monthEnd

      // Get all accounts for this wallet
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true, balance: true },
      })

      const accountIds = accounts.map(a => a.id)
      const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

      // Current month income/expense
      const [currentIncome, currentExpense] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      ])

      // Previous month for comparison
      const [prevIncome, prevExpense] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } },
          _sum: { amount: true },
        }),
      ])

      const monthIncome = Number(currentIncome._sum.amount || 0)
      const monthExpense = Number(currentExpense._sum.amount || 0)
      const monthNet = monthIncome - monthExpense
      const previousMonthNet = Number(prevIncome._sum.amount || 0) - Number(prevExpense._sum.amount || 0)

      return {
        totalBalance,
        monthIncome,
        monthExpense,
        monthNet,
        previousMonthNet,
        changePercent: previousMonthNet === 0
          ? monthNet > 0 ? 100 : 0
          : Math.round(((monthNet - previousMonthNet) / Math.abs(previousMonthNet)) * 100),
      }
    }),

  // Get category breakdown
  getCategoryBreakdown: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      type: z.enum(['INCOME', 'EXPENSE']),
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date(),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true },
      })
      const accountIds = accounts.map(a => a.id)

      const transactions = await ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          accountId: { in: accountIds },
          type: input.type,
          date: { gte: input.dateFrom, lte: input.dateTo },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      })

      const totalAmount = transactions.reduce((sum, t) => sum + Number(t._sum.amount || 0), 0)

      // Fetch category details
      const categoryIds = transactions.map(t => t.categoryId).filter(Boolean) as string[]
      const categories = await ctx.prisma.category.findMany({
        where: { id: { in: categoryIds } },
      })
      const categoryMap = new Map(categories.map(c => [c.id, c]))

      return transactions.map(t => {
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : null
        const amount = Number(t._sum.amount || 0)
        return {
          categoryId: t.categoryId || 'uncategorized',
          categoryName: cat?.name || 'Без категории',
          icon: cat?.icon || null,
          color: cat?.color || null,
          amount,
          percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
          transactionCount: t._count,
        }
      })
    }),

  // Cash flow for last 12 months
  getCashFlow: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      months: z.number().int().min(1).max(24).default(12),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true },
      })
      const accountIds = accounts.map(a => a.id)

      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - input.months + 1, 1)

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          type: { in: ['INCOME', 'EXPENSE'] },
          date: { gte: startDate },
        },
        select: { date: true, type: true, amount: true },
      })

      // Group by month
      const monthMap = new Map<string, { income: number; expense: number }>()
      for (let i = 0; i < input.months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - input.months + 1 + i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap.set(key, { income: 0, expense: 0 })
      }

      for (const tx of transactions) {
        const d = new Date(tx.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const entry = monthMap.get(key)
        if (entry) {
          if (tx.type === 'INCOME') entry.income += Number(tx.amount)
          else entry.expense += Number(tx.amount)
        }
      }

      return Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }))
    }),
  forecast: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysLeft = daysInMonth - dayOfMonth
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return null
    const accounts = await ctx.prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })
    const accountIds = accounts.map((a) => a.id)
    const [incomeAgg, expenseAgg, prevExpAgg] = await Promise.all([
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) } }, _sum: { amount: true } }),
    ])
    const income = Number(incomeAgg._sum.amount ?? 0)
    const expense = Number(expenseAgg._sum.amount ?? 0)
    const prevExp = Number(prevExpAgg._sum.amount ?? 0)
    const ratio = daysInMonth / Math.max(dayOfMonth, 1)
    const projectedExpense = Math.round(expense * ratio)
    const projectedIncome = Math.round(income * ratio)
    const vsLastMonth = prevExp > 0 ? Math.round((projectedExpense - prevExp) / prevExp * 100) : 0
    const status = prevExp > 0 ? (projectedExpense / prevExp > 1.2 ? 'danger' : projectedExpense / prevExp > 1.05 ? 'warning' : 'good') : 'good'
    return { projectedExpense, projectedIncome, projectedBalance: projectedIncome - projectedExpense, vsLastMonth, prevMonthExpense: prevExp, status, daysLeft, dayOfMonth, daysInMonth }
  }),

  monthComparison: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return null
    const accounts = await ctx.prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })
    const accountIds = accounts.map((a) => a.id)
    const [thisInc, thisExp, prevInc, prevExp] = await Promise.all([
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: thisStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: thisStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevStart, lte: prevEnd } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } }, _sum: { amount: true } }),
    ])
    const curr = { income: Number(thisInc._sum.amount ?? 0), expense: Number(thisExp._sum.amount ?? 0) }
    const prev = { income: Number(prevInc._sum.amount ?? 0), expense: Number(prevExp._sum.amount ?? 0) }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projected = Math.round(curr.expense / Math.max(now.getDate(), 1) * daysInMonth)
    const expenseDiff = prev.expense > 0 ? Math.round((projected - prev.expense) / prev.expense * 100) : 0
    return { curr, prev, projectedExpense: projected, expenseDiff, incomeDiff: prev.income > 0 ? Math.round((curr.income - prev.income) / prev.income * 100) : 0, win: expenseDiff < -5, monthName: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now), prevMonthName: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(prevStart) }
  }),

  netWorth: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id }, include: { accounts: { select: { id: true, name: true, balance: true, type: true, currency: true } } } })
    if (!wallet) return null
    const debts = await ctx.prisma.debt.findMany({ where: { userId: ctx.user.id, type: 'BORROWED', status: { in: ['ACTIVE', 'PARTIALLY_REPAID'] } }, select: { counterparty: true, amount: true, paidAmount: true } })
    const totalAssets = wallet.accounts.reduce((s, a) => s + Math.max(0, Number(a.balance)), 0)
    const totalDebts = debts.reduce((s, d) => s + Number(d.amount) - Number(d.paidAmount), 0)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const accountIds = wallet.accounts.map((a) => a.id)
    const [inc, exp] = await Promise.all([
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } }),
    ])
    return { netWorth: Math.round(totalAssets - totalDebts), totalAssets: Math.round(totalAssets), totalDebts: Math.round(totalDebts), monthDelta: Math.round(Number(inc._sum.amount ?? 0) - Number(exp._sum.amount ?? 0)), assets: wallet.accounts.map((a) => ({ name: a.name, balance: Number(a.balance), type: a.type, currency: a.currency })), debts: debts.map((d) => ({ counterparty: d.counterparty, remaining: Math.round(Number(d.amount) - Number(d.paidAmount)) })) }
  }),

  smartGreeting: protectedProcedure.query(async ({ ctx }) => {
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const dayOfMonth = now.getDate()
      const daysLeft = daysInMonth - dayOfMonth
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return null
      const accounts = await ctx.prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })
      const accountIds = accounts.map((a) => a.id)
      const [incAgg, expAgg, budgets] = await Promise.all([
        ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } }, _sum: { amount: true } }),
        ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } }),
        ctx.prisma.budget.findMany({ where: { isActive: true, wallet: { userId: ctx.user.id } }, include: { wallet: { include: { accounts: { select: { id: true } } } } } }),
      ])
      const income = Number(incAgg._sum.amount ?? 0)
      const expense = Number(expAgg._sum.amount ?? 0)
      const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0
      let budgetsExceeded = 0
      for (const b of budgets) {
        const ids = b.wallet.accounts.map((a) => a.id)
        const agg = await ctx.prisma.transaction.aggregate({ where: { accountId: { in: ids }, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } })
        if (Number(agg._sum.amount ?? 0) > Number(b.amount)) budgetsExceeded++
      }
      const hour = now.getHours()
      const greetWord = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
      const firstName = ctx.user.name ? (', ' + ctx.user.name.split(' ')[0]) : ''
      const status = income > 0 && expense > income ? 'danger' : budgetsExceeded > 0 ? 'warning' : 'good'
      const statusEmoji = status === 'danger' ? '🔴' : status === 'warning' ? '🟡' : savingsRate > 0.3 ? '💚' : '🟢'
      const statusText = status === 'danger' ? 'Расходы превышают доходы' : budgetsExceeded > 0 ? (budgetsExceeded + ' ' + (budgetsExceeded === 1 ? 'бюджет превышен' : 'бюджета превышено')) : savingsRate > 0.3 ? 'Отличный темп сбережений!' : 'Темп трат нормальный'
      const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
      const daysWord = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'
      let message = greetWord + firstName + '! До конца месяца ' + daysLeft + ' ' + daysWord + '. ' + statusEmoji + ' ' + statusText + '.'
      if (income > 0 && expense > 0 && income > expense) message += ' Потрачено ' + fmt(expense) + ' из ' + fmt(income) + '.'
      return { message, status, statusEmoji, daysLeft, expense, income }
    } catch (e) {
      console.error("[smartGreeting] error:", e)
      return null
    }
  }),

  dashboardData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const dayOfMonth = now.getDate()
      const daysLeft = daysInMonth - dayOfMonth
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId }, include: { accounts: { select: { id: true, name: true, balance: true, type: true, currency: true } } } })
      if (!wallet) return null
      const accountIds = wallet.accounts.map((a) => a.id)
      const [thisIncome, thisExpense, prevIncome, prevExpense, budgets, goals, debts] = await Promise.all([
        ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } }, _sum: { amount: true } }),
        ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } }),
        ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
        ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
        ctx.prisma.budget.findMany({ where: { isActive: true, wallet: { userId } }, include: { category: true, wallet: { include: { accounts: { select: { id: true } } } } } }),
        ctx.prisma.goal.findMany({ where: { userId, isCompleted: false } }),
        ctx.prisma.debt.findMany({ where: { userId, type: 'BORROWED', status: { in: ['ACTIVE', 'PARTIALLY_REPAID'] } }, select: { counterparty: true, amount: true, paidAmount: true } }),
      ])
      const income = Number(thisIncome._sum.amount ?? 0)
      const expense = Number(thisExpense._sum.amount ?? 0)
      const prevExp = Number(prevExpense._sum.amount ?? 0)
      const prevInc = Number(prevIncome._sum.amount ?? 0)
      // Batch: один groupBy вместо N запросов
      const budgetCategoryIds = budgets.map((b) => b.categoryId).filter(Boolean) as string[]
      const budgetSpending = budgetCategoryIds.length > 0
        ? await ctx.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart }, categoryId: { in: budgetCategoryIds } },
            _sum: { amount: true },
          })
        : []
      const spendMap = new Map(budgetSpending.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]))
      const budgetResults = budgets.map((b) => {
        const spent = spendMap.get(b.categoryId ?? '') ?? 0
        return { exceeded: spent > Number(b.amount), spent, budget: b }
      })
      const budgetsExceeded = budgetResults.filter((r) => r.exceeded).length
      const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0
      const savingsScore = Math.min(40, Math.round((savingsRate / 0.2) * 40))
      const budgetScore = budgets.length > 0 ? Math.round(((budgets.length - budgetsExceeded) / budgets.length) * 30) : 30
      const goalScore = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + Math.min(1, Number(g.currentAmount) / Math.max(1, Number(g.targetAmount))), 0) / goals.length * 15) : 15
      const ratio = daysInMonth / Math.max(dayOfMonth, 1)
      const currProjected = expense * ratio
      const consistencyScore = prevExp > 0 ? (currProjected / prevExp <= 1.0 ? 15 : currProjected / prevExp <= 1.1 ? 12 : currProjected / prevExp <= 1.2 ? 9 : currProjected / prevExp <= 1.4 ? 5 : 0) : 15
      const score = savingsScore + budgetScore + goalScore + consistencyScore
      const scoreLabel = score >= 85 ? 'Отличное здоровье 💚' : score >= 70 ? 'Хорошее здоровье 🟡' : score >= 50 ? 'Есть над чем работать 🟠' : 'Требует внимания 🔴'
      const projectedExpense = Math.round(expense * ratio)
      const projectedIncome = Math.round(income * ratio)
      const forecastStatus = prevExp > 0 ? (projectedExpense / prevExp > 1.2 ? 'danger' : projectedExpense / prevExp > 1.05 ? 'warning' : 'good') : 'good'
      const expenseDiff = prevExp > 0 ? Math.round((projectedExpense - prevExp) / prevExp * 100) : 0
      const hour = now.getHours()
      const greetWord = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
      const firstName = ctx.user.name ? (', ' + ctx.user.name.split(' ')[0]) : ''
      const greetStatus = income > 0 && expense > income ? 'danger' : budgetsExceeded > 0 ? 'warning' : 'good'
      const statusEmoji = greetStatus === 'danger' ? '🔴' : greetStatus === 'warning' ? '🟡' : savingsRate > 0.3 ? '💚' : '🟢'
      const statusText = greetStatus === 'danger' ? 'Расходы превышают доходы' : budgetsExceeded > 0 ? (budgetsExceeded + ' ' + (budgetsExceeded === 1 ? 'бюджет превышен' : 'бюджета превышено')) : savingsRate > 0.3 ? 'Отличный темп сбережений!' : 'Темп трат нормальный'
      const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
      const daysWord = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'
      let greetMessage = greetWord + firstName + '! До конца месяца ' + daysLeft + ' ' + daysWord + '. ' + statusEmoji + ' ' + statusText + '.'
      if (income > 0 && expense > 0 && income > expense) greetMessage += ' Потрачено ' + fmt(expense) + ' из ' + fmt(income) + '.'
      const totalAssets = wallet.accounts.reduce((s, a) => s + Math.max(0, Number(a.balance)), 0)
      const totalDebtsAmount = debts.reduce((s, d) => s + Number(d.amount) - Number(d.paidAmount), 0)
      return {
        score: {
          score, label: scoreLabel, savingsScore, budgetScore, goalScore, consistencyScore,
          trend: 0,  // simplified: no trend calc in dashboardData
          breakdown: [
            { name: 'Норма сбережений', score: savingsScore, max: 40, hint: Math.round(savingsRate * 100) + '% от дохода (цель 20%+)' },
            { name: 'Соблюдение бюджетов', score: budgetScore, max: 30, hint: budgets.length > 0 ? (budgetScore === 30 ? 'Все бюджеты соблюдены' : 'Часть бюджетов превышена') : 'Бюджеты не настроены' },
            { name: 'Прогресс целей', score: goalScore, max: 15, hint: goals.length > 0 ? (goals.length + ' активных целей') : 'Цели не настроены' },
            { name: 'Стабильность трат', score: consistencyScore, max: 15, hint: 'vs прошлый месяц' },
          ],
        },
        forecast: { projectedExpense, projectedIncome, projectedBalance: projectedIncome - projectedExpense, vsLastMonth: expenseDiff, status: forecastStatus, daysLeft, dayOfMonth, daysInMonth },
        comparison: { expenseDiff, win: expenseDiff < -5, projectedExpense, prevMonthExpense: prevExp, income, expense, prevIncome: prevInc },
        greeting: { message: greetMessage, status: greetStatus, statusEmoji },
        netWorthSummary: { totalAssets: Math.round(totalAssets), totalDebts: Math.round(totalDebtsAmount), netWorth: Math.round(totalAssets - totalDebtsAmount), monthDelta: Math.round(income - expense) },
        budgets: budgetResults.map((r) => ({ ...r.budget, spentAmount: r.spent, percentage: Number(r.budget.amount) > 0 ? Math.round(r.spent / Number(r.budget.amount) * 100) : 0 })),
        goals,
      }
    } catch (e) {
      console.error('[dashboardData] error:', e)
      return null
    }
  }),

  getTopCounterparties: protectedProcedure
    .input(z.object({ period: z.enum(['1m', '3m']).default('1m') }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const from = input.period === '1m'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return []
      const accounts = await ctx.prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } })
      const accountIds = accounts.map((a) => a.id)
      const txs = await ctx.prisma.transaction.findMany({
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: from }, description: { not: null } },
        select: { description: true, amount: true },
      })
      const map = new Map<string, number>()
      for (const tx of txs) {
        if (!tx.description) continue
        const key = tx.description.trim().slice(0, 40)
        map.set(key, (map.get(key) ?? 0) + Number(tx.amount))
      }
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    }),

})
