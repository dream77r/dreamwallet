import { z } from 'zod'

// ─── Transaction ───────────────────────────────
export const createTransactionSchema = z.object({
  accountId: z.string().cuid(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive('Сумма должна быть положительной'),
  currency: z.string().default('RUB'),
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
  counterparty: z.string().max(200).optional(),
  categoryId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  transferToAccountId: z.string().cuid().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().cuid(),
})

export const transactionFiltersSchema = z.object({
  accountId: z.string().cuid().optional(),
  walletId: z.string().cuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  categoryId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.enum(['MANUAL', 'CSV_IMPORT', 'BANK_SYNC', 'API', 'RECURRING']).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ─── Account ───────────────────────────────────
export const createAccountSchema = z.object({
  walletId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['BANK_ACCOUNT', 'CASH', 'CRYPTO', 'INVESTMENT', 'CREDIT_CARD', 'SAVINGS', 'CUSTOM']),
  currency: z.string().default('RUB'),
  initialBalance: z.number().default(0),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export const updateAccountSchema = createAccountSchema.partial().extend({
  id: z.string().cuid(),
})

// ─── Project ───────────────────────────────────
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  currency: z.string().default('RUB'),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().cuid(),
})

// ─── Category ──────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().cuid().optional(),
})

// ─── Budget ────────────────────────────────────
export const createBudgetSchema = z.object({
  walletId: z.string().cuid(),
  categoryId: z.string().cuid(),
  amount: z.number().positive(),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  alertThreshold: z.number().int().min(1).max(100).default(80),
})

// ─── Import ────────────────────────────────────
export const columnMapSchema = z.object({
  date: z.string(),
  amount: z.string(),
  description: z.string().optional(),
  counterparty: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
})

export const importConfigSchema = z.object({
  accountId: z.string().cuid(),
  templateId: z.string().cuid().optional(),
  columnMap: columnMapSchema,
  dateFormat: z.string().default('DD.MM.YYYY'),
  delimiter: z.string().default(','),
  skipRows: z.number().int().min(0).default(0),
  saveName: z.string().optional(),
})

// ─── Settings ──────────────────────────────────
export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.enum(['ru', 'en']).optional(),
})

// ─── Auth ──────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  name: z.string().min(1).max(100),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Type exports ──────────────────────────────
export type CreateTransaction = z.infer<typeof createTransactionSchema>
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>
export type CreateAccount = z.infer<typeof createAccountSchema>
export type UpdateAccount = z.infer<typeof updateAccountSchema>
export type CreateProject = z.infer<typeof createProjectSchema>
export type UpdateProject = z.infer<typeof updateProjectSchema>
export type CreateCategory = z.infer<typeof createCategorySchema>
export type CreateBudget = z.infer<typeof createBudgetSchema>
export type ImportConfig = z.infer<typeof importConfigSchema>
export type UpdateSettings = z.infer<typeof updateSettingsSchema>
