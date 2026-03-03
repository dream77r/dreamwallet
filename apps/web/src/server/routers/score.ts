import { router, protectedProcedure } from '../trpc'

export const scoreRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return { score: 0, breakdown: [], trend: 0, label: 'Нет данных' }

    const accounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
    const accountIds = accounts.map((a) => a.id)

    // === 1. Savings Rate (40 pts) ===
    // Считаем за текущий + предыдущий месяц для стабильности
    const [incomeAgg, expenseAgg] = await Promise.all([
      ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevMonthStart } },
        _sum: { amount: true },
      }),
      ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart } },
        _sum: { amount: true },
      }),
    ])
    const income = Number(incomeAgg._sum.amount ?? 0)
    const expense = Number(expenseAgg._sum.amount ?? 0)
    const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0
    // 20%+ savings rate = full 40 pts
    const savingsScore = Math.min(40, Math.round((savingsRate / 0.20) * 40))

    // === 2. Budget Adherence (30 pts) ===
    const budgets = await ctx.prisma.budget.findMany({
      where: { isActive: true, wallet: { userId: ctx.user.id } },
      include: { wallet: { include: { accounts: { select: { id: true } } } } },
    })
    let budgetScore = 30 // full if no budgets set
    if (budgets.length > 0) {
      const results = await Promise.all(
        budgets.map(async (b) => {
          const ids = b.wallet.accounts.map((a) => a.id)
          const agg = await ctx.prisma.transaction.aggregate({
            where: { accountId: { in: ids }, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: monthStart } },
            _sum: { amount: true },
          })
          return Number(agg._sum.amount ?? 0) <= Number(b.amount)
        })
      )
      const respected = results.filter(Boolean).length
      budgetScore = Math.round((respected / budgets.length) * 30)
    }

    // === 3. Goal Progress (15 pts) ===
    const goals = await ctx.prisma.goal.findMany({
      where: { userId: ctx.user.id, isCompleted: false },
    })
    let goalScore = 15 // full if no goals (не штрафуем)
    if (goals.length > 0) {
      const avgProgress = goals.reduce((sum, g) => {
        const pct = Number(g.targetAmount) > 0
          ? Math.min(1, Number(g.currentAmount) / Number(g.targetAmount))
          : 0
        return sum + pct
      }, 0) / goals.length
      goalScore = Math.round(avgProgress * 15)
    }

    // === 4. Consistency (15 pts) ===
    // Сравниваем расходы этого месяца с прошлым. Если не хуже чем на 20% — полный балл
    const [prevExpense, currExpense] = await Promise.all([
      ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { amount: true },
      }),
      ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ])
    const prev = Number(prevExpense._sum.amount ?? 0)
    const curr = Number(currExpense._sum.amount ?? 0)
    // Нормализуем curr по дням месяца
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currProjected = dayOfMonth > 0 ? (curr / dayOfMonth) * daysInMonth : curr
    let consistencyScore = 15
    if (prev > 0) {
      const ratio = currProjected / prev
      if (ratio <= 1.0) consistencyScore = 15
      else if (ratio <= 1.1) consistencyScore = 12
      else if (ratio <= 1.2) consistencyScore = 9
      else if (ratio <= 1.4) consistencyScore = 5
      else consistencyScore = 0
    }

    const total = savingsScore + budgetScore + goalScore + consistencyScore

    // Trend: сравниваем с прошлым месяцем (упрощённо — разница в savings rate)
    const prevSavingsRate = income > 0 ? Math.max(0, (income - prev) / income) : 0
    const trend = Math.round((savingsRate - prevSavingsRate) * 100)

    const label =
      total >= 85 ? 'Отличное здоровье 💚' :
        total >= 70 ? 'Хорошее здоровье 🟡' :
          total >= 50 ? 'Есть над чем работать 🟠' :
            'Требует внимания 🔴'

    return {
      score: total,
      label,
      trend,
      breakdown: [
        { name: 'Норма сбережений', score: savingsScore, max: 40, hint: `${Math.round(savingsRate * 100)}% от дохода (цель 20%+)` },
        { name: 'Соблюдение бюджетов', score: budgetScore, max: 30, hint: budgets.length > 0 ? `${budgetScore === 30 ? 'Все' : 'Часть'} бюджетов соблюдены` : 'Бюджеты не настроены' },
        { name: 'Прогресс целей', score: goalScore, max: 15, hint: goals.length > 0 ? `${goals.length} активных целей` : 'Цели не настроены' },
        { name: 'Стабильность трат', score: consistencyScore, max: 15, hint: prev > 0 ? `Прогноз ${currProjected > prev ? '+' : ''}${Math.round((currProjected / prev - 1) * 100)}% к прошлому месяцу` : 'Недостаточно данных' },
      ],
    }
  }),
})
