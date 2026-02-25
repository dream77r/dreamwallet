// ─── Dashboard Stats ───────────────────────────
export interface DashboardStats {
  totalBalance: number
  monthIncome: number
  monthExpense: number
  monthNet: number
  previousMonthNet: number
  changePercent: number
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  icon: string | null
  color: string | null
  amount: number
  percentage: number
  transactionCount: number
}

export interface CashFlowPoint {
  month: string  // "2026-01"
  income: number
  expense: number
  net: number
}

export interface BudgetProgress {
  budgetId: string
  categoryName: string
  icon: string | null
  color: string | null
  budgetAmount: number
  spentAmount: number
  percentage: number
  period: string
}

// ─── Project Dashboard ─────────────────────────
export interface ProjectDashboard {
  revenue: number
  expenses: number
  profit: number
  profitMargin: number
  cashFlow: CashFlowPoint[]
  topExpenseCategories: CategoryBreakdown[]
  topIncomeCategories: CategoryBreakdown[]
}

// ─── Net Worth ─────────────────────────────────
export interface NetWorthBreakdown {
  personal: number
  projects: { id: string; name: string; balance: number }[]
  total: number
}

// ─── Pagination ────────────────────────────────
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── API Response ──────────────────────────────
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
