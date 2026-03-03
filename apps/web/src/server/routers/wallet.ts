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

  // Get top counterparties for a period
  getTopCounterparties: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      limit: z.number().int().min(1).max(50).default(10),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true },
      })
      const accountIds = accounts.map(a => a.id)

      const result = await ctx.prisma.transaction.groupBy({
        by: ['counterparty'],
        where: {
          accountId: { in: accountIds },
          type: 'EXPENSE',
          NOT: [
            { counterparty: null },
            { counterparty: "" }
          ],
          ...(input.dateFrom || input.dateTo ? {
            date: {
              ...(input.dateFrom && { gte: input.dateFrom }),
              ...(input.dateTo && { lte: input.dateTo }),
            }
          } : {}),
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: input.limit,
      })

      return result.map(r => ({
        name: r.counterparty || 'Unknown',
        amount: Number(r._sum?.amount ?? 0),
      }))
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

      const dailyStats = await ctx.prisma.transaction.groupBy({
        by: ['date', 'type'],
        where: {
          accountId: { in: accountIds },
          type: { in: ['INCOME', 'EXPENSE'] },
          date: { gte: startDate },
        },
        _sum: { amount: true },
      })

      // Group by month
      const monthMap = new Map<string, { income: number; expense: number }>()
      for (let i = 0; i < input.months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - input.months + 1 + i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap.set(key, { income: 0, expense: 0 })
      }

      for (const stat of dailyStats) {
        const d = new Date(stat.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const entry = monthMap.get(key)
        if (entry) {
          const amount = Number(stat._sum.amount ?? 0)
          if (stat.type === 'INCOME') entry.income += amount
          else entry.expense += amount
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
    return forecastQuery(ctx.prisma, ctx.user.id)
  }),

  monthComparison: protectedProcedure.query(async ({ ctx }) => {
    return monthComparisonQuery(ctx.prisma, ctx.user.id)
  }),

  netWorth: protectedProcedure.query(async ({ ctx }) => {
    return netWorthQuery(ctx.prisma, ctx.user.id)
  }),
})

// Monthly forecast — проецируем текущий темп трат на конец месяца
export const forecastQuery = async (prisma: any, userId: string) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()

  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return null

  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id },
    select: { id: true },
  })
  const accountIds = accounts.map((a: any) => a.id)

  // Текущие доходы и расходы с начала месяца
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ])

  const incomeToDate = Number(incomeAgg._sum.amount ?? 0)
  const expenseToDate = Number(expenseAgg._sum.amount ?? 0)

  // Проецируем на конец месяца
  const ratio = dayOfMonth > 0 ? daysInMonth / dayOfMonth : 1
  const projectedExpense = expenseToDate * ratio
  const projectedIncome = incomeToDate * ratio
  const projectedBalance = projectedIncome - projectedExpense

  // Прошлый месяц для сравнения
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const prevExpenseAgg = await prisma.transaction.aggregate({
    where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } },
    _sum: { amount: true },
  })
  const prevMonthExpense = Number(prevExpenseAgg._sum.amount ?? 0)

  // Статус: нормально / осторожно / тревога
  const vsLastMonth = prevMonthExpense > 0
    ? (projectedExpense - prevMonthExpense) / prevMonthExpense
    : 0

  const status: 'good' | 'warning' | 'danger' =
    vsLastMonth > 0.2 ? 'danger' :
      vsLastMonth > 0.05 ? 'warning' : 'good'

  const daysLeft = daysInMonth - dayOfMonth

  return {
    daysLeft,
    daysInMonth,
    dayOfMonth,
    incomeToDate,
    expenseToDate,
    projectedExpense: Math.round(projectedExpense),
    projectedIncome: Math.round(projectedIncome),
    projectedBalance: Math.round(projectedBalance),
    vsLastMonth: Math.round(vsLastMonth * 100), // % vs прошлый месяц
    prevMonthExpense: Math.round(prevMonthExpense),
    status,
  }
}

export const monthComparisonQuery = async (prisma: any, userId: string) => {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return null

  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id }, select: { id: true },
  })
  const accountIds = accounts.map((a: any) => a.id)

  const [thisIncome, thisExpense, prevIncome, prevExpense] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: thisMonthStart } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: thisMonthStart } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
  ])

  // Нормализуем текущий месяц по дням
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const ratio = daysInMonth / Math.max(dayOfMonth, 1)

  const curr = {
    income: Number(thisIncome._sum.amount ?? 0),
    expense: Number(thisExpense._sum.amount ?? 0),
  }
  const prev = {
    income: Number(prevIncome._sum.amount ?? 0),
    expense: Number(prevExpense._sum.amount ?? 0),
  }

  const projectedExpense = Math.round(curr.expense * ratio)
  const expenseDiff = prev.expense > 0 ? Math.round((projectedExpense - prev.expense) / prev.expense * 100) : 0
  const incomeDiff = prev.income > 0 ? Math.round((curr.income - prev.income) / prev.income * 100) : 0

  const win = expenseDiff < -5  // потратили заметно меньше — победа!

  return {
    curr: { income: curr.income, expense: curr.expense },
    prev: { income: prev.income, expense: prev.expense },
    projectedExpense,
    expenseDiff,  // % изменение расходов (отрицательный = хорошо)
    incomeDiff,   // % изменение доходов
    win,          // показывать конфетти/похвалу
    monthName: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now),
    prevMonthName: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(prevMonthStart),
  }
}

export const netWorthQuery = async (prisma: any, userId: string) => {
  const wallet = await prisma.wallet.findFirst({
    where: { userId },
    include: {
      accounts: { select: { id: true, balance: true, type: true, name: true, currency: true } },
    },
  })
  if (!wallet) return null

  // Активы = сумма счетов с положительным балансом
  const assets = wallet.accounts
    .filter((a: any) => Number(a.balance) >= 0)
    .map((a: any) => ({ name: a.name, balance: Number(a.balance), type: a.type, currency: a.currency }))

  // Пассивы = долги (я должен)
  const debts = await prisma.debt.findMany({
    where: { userId, type: 'BORROWED', status: { in: ['ACTIVE', 'PARTIALLY_REPAID'] } },
    select: { counterparty: true, amount: true, paidAmount: true },
  })

  const totalAssets = assets.reduce((s: number, a: any) => s + a.balance, 0)
  const totalDebts = debts.reduce((s: number, d: any) => s + Number(d.amount) - Number(d.paidAmount), 0)
  const netWorth = totalAssets - totalDebts

  // Прошлый месяц (активы не менялись — берём транзакции для delta)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const accountIds = wallet.accounts.map((a: any) => a.id)
  const [inc, exp] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } }),
  ])
  const monthDelta = Number(inc._sum.amount ?? 0) - Number(exp._sum.amount ?? 0)

  return {
    netWorth: Math.round(netWorth),
    totalAssets: Math.round(totalAssets),
    totalDebts: Math.round(totalDebts),
    monthDelta: Math.round(monthDelta),
    assets,
    debts: debts.map((d: any) => ({
      counterparty: d.counterparty,
      remaining: Math.round(Number(d.amount) - Number(d.paidAmount)),
    })),
  }
}

export const smartGreetingQuery = async (prisma: any, userId: string, userName: string | null) => {
  const now = new Date()
  const hour = now.getHours()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - dayOfMonth

  const wallet = await prisma.wallet.findFirst({ where: { userId } })
  if (!wallet) return null

  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id }, select: { id: true },
  })
  const accountIds = accounts.map((a: any) => a.id)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [expenseAgg, incomeAgg, budgets] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({
      where: { isActive: true, wallet: { userId } },
      include: { wallet: { include: { accounts: { select: { id: true } } } } },
    }),
  ])

  const expense = Number(expenseAgg._sum.amount ?? 0)
  const income = Number(incomeAgg._sum.amount ?? 0)
  const dailyRate = dayOfMonth > 0 ? expense / dayOfMonth : 0
  const projectedExpense = dailyRate * daysInMonth

  // Бюджеты — сколько превышено
  let budgetsExceeded = 0
  for (const b of budgets) {
    const ids = b.wallet.accounts.map((a: any) => a.id)
    const agg = await prisma.transaction.aggregate({
      where: { accountId: { in: ids }, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: monthStart } },
      _sum: { amount: true },
    })
    if (Number(agg._sum.amount ?? 0) > Number(b.amount)) budgetsExceeded++
  }

  // Строим нарратив
  const greetWord = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
  const name = userName ? `, ${userName.split(' ')[0]}` : ''

  // Статус трат
  const savingsRate = income > 0 ? (income - expense) / income : 0
  let status: 'good' | 'warning' | 'danger' = 'good'
  let statusEmoji = '🟢'
  let statusText = 'Темп трат нормальный'

  if (savingsRate < 0) {
    status = 'danger'
    statusEmoji = '🔴'
    statusText = 'Расходы превышают доходы'
  } else if (budgetsExceeded > 0) {
    status = 'warning'
    statusEmoji = '🟡'
    statusText = `${budgetsExceeded} ${budgetsExceeded === 1 ? 'бюджет превышен' : 'бюджета превышено'}`
  } else if (savingsRate > 0.3) {
    statusEmoji = '💚'
    statusText = 'Отличный темп сбережений!'
  }

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 
  smartGreeting: protectedProcedure.query(async ({ ctx }) => {
    return smartGreetingQuery(ctx.prisma, ctx.user.id, ctx.user.name ?? null)
  }),

  dashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysLeft = daysInMonth - dayOfMonth

    // ONE wallet lookup + accounts
    const wallet = await ctx.prisma.wallet.findFirst({
      where: { userId },
      include: {
        accounts: { select: { id: true, name: true, balance: true, type: true, currency: true } },
      },
    })
    if (!wallet) return null

    const accountIds = wallet.accounts.map((a) => a.id)

    // ALL aggregations in parallel
    const [
      thisIncome, thisExpense,
      prevIncome, prevExpense,
      budgets, goals, debts,
    ] = await Promise.all([
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: monthStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
      ctx.prisma.transaction.aggregate({ where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
      ctx.prisma.budget.findMany({ where: { isActive: true, wallet: { userId } }, include: { category: true, wallet: { include: { accounts: { select: { id: true } } } } } }),
      ctx.prisma.goal.findMany({ where: { wallet: { userId }, isCompleted: false } }),
      ctx.prisma.debt.findMany({ where: { userId, type: 'BORROWED', status: { in: ['ACTIVE', 'PARTIALLY_REPAID'] } }, select: { counterparty: true, amount: true, paidAmount: true } }),
    ])

    const income = Number(thisIncome._sum.amount ?? 0)
    const expense = Number(thisExpense._sum.amount ?? 0)
    const prevExp = Number(prevExpense._sum.amount ?? 0)
    const prevInc = Number(prevIncome._sum.amount ?? 0)

    // Budget adherence
    const budgetResults = await Promise.all(
      budgets.map(async (b) => {
        const ids = b.wallet.accounts.map((a) => a.id)
        const agg = await ctx.prisma.transaction.aggregate({
          where: { accountId: { in: ids }, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: monthStart } },
          _sum: { amount: true },
        })
        const spent = Number(agg._sum.amount ?? 0)
        return { exceeded: spent > Number(b.amount), spent, budget: b }
      })
    )
    const budgetsExceeded = budgetResults.filter((r) => r.exceeded).length

    // Score
    const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0
    const savingsScore = Math.min(40, Math.round((savingsRate / 0.20) * 40))
    const budgetScore = budgets.length > 0 ? Math.round(((budgets.length - budgetsExceeded) / budgets.length) * 30) : 30
    const goalScore = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + Math.min(1, Number(g.currentAmount) / Math.max(1, Number(g.targetAmount))), 0) / goals.length * 15) : 15
    const ratio = daysInMonth / Math.max(dayOfMonth, 1)
    const currProjected = expense * ratio
    const consistencyScore = prevExp > 0 ? (currProjected / prevExp <= 1.0 ? 15 : currProjected / prevExp <= 1.1 ? 12 : currProjected / prevExp <= 1.2 ? 9 : currProjected / prevExp <= 1.4 ? 5 : 0) : 15
    const score = savingsScore + budgetScore + goalScore + consistencyScore
    const scoreLabel = score >= 85 ? 'Отличное здоровье 💚' : score >= 70 ? 'Хорошее здоровье 🟡' : score >= 50 ? 'Есть над чем работать 🟠' : 'Требует внимания 🔴'

    // Forecast
    const projectedExpense = Math.round(expense * ratio)
    const projectedIncome = Math.round(income * ratio)
    const forecastStatus = prevExp > 0 ? (projectedExpense / prevExp > 1.2 ? 'danger' : projectedExpense / prevExp > 1.05 ? 'warning' : 'good') : 'good'

    // Comparison
    const expenseDiff = prevExp > 0 ? Math.round((projectedExpense - prevExp) / prevExp * 100) : 0
    const win = expenseDiff < -5

    // Greeting
    const hour = now.getHours()
    const greetWord = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
    const name = ctx.user.name ? `, ${ctx.user.name.split(' ')[0]}` : ''
    const greetStatus = income > 0 && expense > income ? 'danger' : budgetsExceeded > 0 ? 'warning' : savingsRate > 0.3 ? 'good' : 'good'
    const statusEmoji = greetStatus === 'danger' ? '🔴' : greetStatus === 'warning' ? '🟡' : savingsRate > 0.3 ? '💚' : '🟢'
    const statusText = greetStatus === 'danger' ? 'Расходы превышают доходы' : budgetsExceeded > 0 ? \`\${budgetsExceeded} бюджет\${budgetsExceeded > 1 ? 'а' : ''} превышено\` : savingsRate > 0.3 ? 'Отличный темп сбережений!' : 'Темп трат нормальный'
    const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
    let greetMessage = \`\${greetWord}\${name}! До конца месяца \${daysLeft} \${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}. \${statusEmoji} \${statusText}.\`
    if (income > 0 && expense > 0) greetMessage += \` Потрачено \${fmt(expense)} из \${fmt(income)}.\`

    // Net worth
    const totalAssets = wallet.accounts.reduce((s, a) => s + Math.max(0, Number(a.balance)), 0)
    const totalDebtsAmount = debts.reduce((s, d) => s + Number(d.amount) - Number(d.paidAmount), 0)

    return {
      score: { score, label: scoreLabel, savingsScore, budgetScore, goalScore, consistencyScore },
      forecast: { projectedExpense, projectedIncome, projectedBalance: projectedIncome - projectedExpense, vsLastMonth: expenseDiff, status: forecastStatus, daysLeft, dayOfMonth, daysInMonth },
      comparison: { expenseDiff, win, projectedExpense, prevMonthExpense: prevExp, income, expense, prevIncome: prevInc },
      greeting: { message: greetMessage, status: greetStatus, statusEmoji },
      netWorthSummary: { totalAssets: Math.round(totalAssets), totalDebts: Math.round(totalDebtsAmount), netWorth: Math.round(totalAssets - totalDebtsAmount), monthDelta: Math.round(income - expense) },
      budgets: budgetResults.map((r) => ({ ...r.budget, spentAmount: r.spent, percentage: Number(r.budget.amount) > 0 ? Math.round(r.spent / Number(r.budget.amount) * 100) : 0 })),
      goals,
    }
  }),
}).format(n)

  // Главное сообщение
  let message = `${greetWord}${name}! До конца месяца ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}. ${statusEmoji} ${statusText}.`

  if (income > 0 && expense > 0) {
    const remaining = income - expense
    if (remaining > 0) {
      message += ` Потрачено ${fmt(expense)} из ${fmt(income)}.`
    }
  }

  return { message, status, statusEmoji, daysLeft, projectedExpense: Math.round(projectedExpense), expense, income }
}
