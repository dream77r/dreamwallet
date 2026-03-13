// ─── Subscription Limits ───────────────────────
export const PLAN_LIMITS = {
  FREE: {
    maxProjects: 1,
    maxAccounts: 3,
    maxBankConnections: 0,
    maxProjectMembers: 0,
    hasAiCategorization: false,
    hasCustomReports: false,
    hasExport: false,
    hasApiAccess: false,
    transactionHistoryMonths: 6,
  },
  PRO: {
    maxProjects: -1, // unlimited
    maxAccounts: 20,
    maxBankConnections: 2,
    maxProjectMembers: 3,
    hasAiCategorization: true,
    hasCustomReports: true,
    hasExport: true,
    hasApiAccess: false,
    transactionHistoryMonths: 36,
  },
  BUSINESS: {
    maxProjects: -1,
    maxAccounts: -1,
    maxBankConnections: -1,
    maxProjectMembers: -1,
    hasAiCategorization: true,
    hasCustomReports: true,
    hasExport: true,
    hasApiAccess: true,
    transactionHistoryMonths: -1, // unlimited
  },
  CUSTOM: {
    maxProjects: -1,
    maxAccounts: -1,
    maxBankConnections: -1,
    maxProjectMembers: -1,
    hasAiCategorization: true,
    hasCustomReports: true,
    hasExport: true,
    hasApiAccess: true,
    transactionHistoryMonths: -1, // unlimited — overridden by DB config
  },
} as const

// ─── Default Categories ────────────────────────
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Продукты', icon: '🛒', color: '#F59E0B' },
  { name: 'Кафе и рестораны', icon: '🍽️', color: '#FB923C' },
  { name: 'Транспорт', icon: '🚌', color: '#3B82F6' },
  { name: 'Авто', icon: '🚗', color: '#64748B' },
  { name: 'Жильё', icon: '🏠', color: '#8B5CF6' },
  { name: 'Коммунальные', icon: '💡', color: '#6366F1' },
  { name: 'Здоровье', icon: '💊', color: '#EF4444' },
  { name: 'Одежда', icon: '👕', color: '#EC4899' },
  { name: 'Электроника', icon: '🖥️', color: '#0EA5E9' },
  { name: 'Покупки', icon: '🛍️', color: '#A855F7' },
  { name: 'Связь', icon: '📡', color: '#06B6D4' },
  { name: 'Подписки', icon: '📱', color: '#14B8A6' },
  { name: 'Развлечения', icon: '🎬', color: '#F97316' },
  { name: 'Спорт', icon: '🏃', color: '#22C55E' },
  { name: 'Путешествия', icon: '✈️', color: '#0284C7' },
  { name: 'Образование', icon: '📚', color: '#7C3AED' },
  { name: 'Налоги', icon: '🏛️', color: '#64748B' },
  { name: 'Зарплата (расход)', icon: '👥', color: '#A855F7' },
  { name: 'Аренда офиса', icon: '🏢', color: '#78716C' },
  { name: 'Маркетинг', icon: '📣', color: '#FB923C' },
  { name: 'Прочее', icon: '📦', color: '#94A3B8' },
] as const

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Зарплата', icon: '💰', color: '#22C55E' },
  { name: 'Фриланс', icon: '💻', color: '#10B981' },
  { name: 'Выручка бизнеса', icon: '🏪', color: '#059669' },
  { name: 'Инвестиции', icon: '📈', color: '#34D399' },
  { name: 'Дивиденды', icon: '🏦', color: '#6EE7B7' },
  { name: 'Возврат', icon: '↩️', color: '#A7F3D0' },
  { name: 'Прочий доход', icon: '✨', color: '#86EFAC' },
] as const

// ─── Currencies ────────────────────────────────
export const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'CNY', 'TRY', 'AED'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

// ─── App ───────────────────────────────────────
export const APP_NAME = 'DreamWallet'
export const APP_DESCRIPTION = 'Управление личными и бизнес-финансами'
