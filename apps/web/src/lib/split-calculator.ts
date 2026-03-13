/**
 * Split Expenses Calculator — вычисление балансов и минимизация долгов
 */

export interface Balance {
  participantId: string
  name: string
  balance: number // positive = owed money, negative = owes money
}

export interface Debt {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export function calculateBalances(
  participants: Array<{ id: string; name: string }>,
  expenses: Array<{
    paidById: string
    shares: Array<{ participantId: string; amount: number }>
  }>,
  payments: Array<{ fromId: string; toId: string; amount: number }>,
): Balance[] {
  const balanceMap = new Map<string, number>()

  // Initialize
  for (const p of participants) {
    balanceMap.set(p.id, 0)
  }

  // Process expenses
  for (const expense of expenses) {
    for (const share of expense.shares) {
      // Payer gets credit
      if (share.participantId !== expense.paidById) {
        balanceMap.set(expense.paidById, (balanceMap.get(expense.paidById) ?? 0) + share.amount)
        balanceMap.set(share.participantId, (balanceMap.get(share.participantId) ?? 0) - share.amount)
      }
    }
  }

  // Process payments (settlements)
  for (const payment of payments) {
    balanceMap.set(payment.fromId, (balanceMap.get(payment.fromId) ?? 0) + payment.amount)
    balanceMap.set(payment.toId, (balanceMap.get(payment.toId) ?? 0) - payment.amount)
  }

  return participants.map(p => ({
    participantId: p.id,
    name: p.name,
    balance: Math.round((balanceMap.get(p.id) ?? 0) * 100) / 100,
  }))
}

/**
 * Simplify debts — minimize number of transactions
 * Uses greedy algorithm: match largest creditor with largest debtor
 */
export function simplifyDebts(balances: Balance[]): Debt[] {
  const debts: Debt[] = []

  // Split into creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .map(b => ({ ...b }))
    .sort((a, b) => b.balance - a.balance)

  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance)

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    const amount = Math.min(creditor.balance, debtor.balance)
    if (amount > 0.01) {
      debts.push({
        fromId: debtor.participantId,
        fromName: debtor.name,
        toId: creditor.participantId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      })
    }

    creditor.balance -= amount
    debtor.balance -= amount

    if (creditor.balance < 0.01) ci++
    if (debtor.balance < 0.01) di++
  }

  return debts
}
