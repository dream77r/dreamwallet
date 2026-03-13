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

// ─── Subscription Categories & Catalog ────────────
export const SUBSCRIPTION_CATEGORIES = {
  streaming: { key: 'streaming', label: 'Стриминг',  icon: '🎬' },
  music:     { key: 'music',     label: 'Музыка',    icon: '🎵' },
  cloud:     { key: 'cloud',     label: 'Облако',    icon: '☁️' },
  fitness:   { key: 'fitness',   label: 'Фитнес',    icon: '💪' },
  telecom:   { key: 'telecom',   label: 'Связь',     icon: '📱' },
  software:  { key: 'software',  label: 'Софт',      icon: '💻' },
  other:     { key: 'other',     label: 'Другое',    icon: '📦' },
} as const

export type SubscriptionCategoryKey = keyof typeof SUBSCRIPTION_CATEGORIES

export const SUBSCRIPTION_CATALOG = [
  { id: 'yandex-plus',      name: 'Яндекс.Плюс',       defaultAmount: 399,   categoryKey: 'streaming' as const, icon: '🟡', schedule: '0 9 1 * *' as const },
  { id: 'netflix',           name: 'Netflix',            defaultAmount: 999,   categoryKey: 'streaming' as const, icon: '🎬', schedule: '0 9 1 * *' as const },
  { id: 'kinopoisk',         name: 'Кинопоиск',         defaultAmount: 299,   categoryKey: 'streaming' as const, icon: '🎥', schedule: '0 9 1 * *' as const },
  { id: 'youtube-premium',   name: 'YouTube Premium',    defaultAmount: 299,   categoryKey: 'streaming' as const, icon: '▶️', schedule: '0 9 1 * *' as const },
  { id: 'ivi',               name: 'IVI',                defaultAmount: 399,   categoryKey: 'streaming' as const, icon: '📺', schedule: '0 9 1 * *' as const },
  { id: 'spotify',           name: 'Spotify',            defaultAmount: 299,   categoryKey: 'music' as const,     icon: '🎵', schedule: '0 9 1 * *' as const },
  { id: 'yandex-music',      name: 'Яндекс.Музыка',     defaultAmount: 299,   categoryKey: 'music' as const,     icon: '🎶', schedule: '0 9 1 * *' as const },
  { id: 'apple-music',       name: 'Apple Music',        defaultAmount: 269,   categoryKey: 'music' as const,     icon: '🍎', schedule: '0 9 1 * *' as const },
  { id: 'icloud',            name: 'iCloud',             defaultAmount: 99,    categoryKey: 'cloud' as const,     icon: '☁️', schedule: '0 9 1 * *' as const },
  { id: 'google-one',        name: 'Google One',         defaultAmount: 139,   categoryKey: 'cloud' as const,     icon: '🔵', schedule: '0 9 1 * *' as const },
  { id: 'dropbox',           name: 'Dropbox',            defaultAmount: 990,   categoryKey: 'cloud' as const,     icon: '📦', schedule: '0 9 1 * *' as const },
  { id: 'chatgpt-plus',      name: 'ChatGPT Plus',       defaultAmount: 1500,  categoryKey: 'software' as const,  icon: '🤖', schedule: '0 9 1 * *' as const },
  { id: 'notion',            name: 'Notion',             defaultAmount: 800,   categoryKey: 'software' as const,  icon: '📝', schedule: '0 9 1 * *' as const },
  { id: 'figma',             name: 'Figma',              defaultAmount: 1200,  categoryKey: 'software' as const,  icon: '🎨', schedule: '0 9 1 * *' as const },
  { id: 'github-copilot',    name: 'GitHub Copilot',     defaultAmount: 750,   categoryKey: 'software' as const,  icon: '🐙', schedule: '0 9 1 * *' as const },
  { id: 'gym',               name: 'Фитнес-клуб',       defaultAmount: 3000,  categoryKey: 'fitness' as const,   icon: '🏋️', schedule: '0 9 1 * *' as const },
  { id: 'mts',               name: 'МТС',               defaultAmount: 500,   categoryKey: 'telecom' as const,   icon: '📡', schedule: '0 9 1 * *' as const },
  { id: 'megafon',           name: 'МегаФон',            defaultAmount: 500,   categoryKey: 'telecom' as const,   icon: '📶', schedule: '0 9 1 * *' as const },
  { id: 'beeline',           name: 'Билайн',             defaultAmount: 500,   categoryKey: 'telecom' as const,   icon: '🐝', schedule: '0 9 1 * *' as const },
  { id: 'tele2',             name: 'Tele2',              defaultAmount: 400,   categoryKey: 'telecom' as const,   icon: '📞', schedule: '0 9 1 * *' as const },
  { id: 'internet-home',     name: 'Домашний интернет',  defaultAmount: 700,   categoryKey: 'telecom' as const,   icon: '🌐', schedule: '0 9 1 * *' as const },
  { id: 'vpn',               name: 'VPN',                defaultAmount: 300,   categoryKey: 'software' as const,  icon: '🔒', schedule: '0 9 1 * *' as const },
  { id: 'telegram-premium',  name: 'Telegram Premium',   defaultAmount: 299,   categoryKey: 'software' as const,  icon: '✈️', schedule: '0 9 1 * *' as const },
] as const

export type SubscriptionCatalogItem = (typeof SUBSCRIPTION_CATALOG)[number]

export const SCHEDULE_OPTIONS = [
  { value: '0 9 * * *'   as const, label: 'Ежедневно',     short: 'Каждый день',   multiplierToMonthly: 30 },
  { value: '0 9 * * 1'   as const, label: 'Еженедельно',   short: 'Каждую неделю', multiplierToMonthly: 4.33 },
  { value: '0 9 1 * *'   as const, label: 'Ежемесячно',    short: 'Каждый месяц',  multiplierToMonthly: 1 },
  { value: '0 9 1 */3 *' as const, label: 'Ежеквартально', short: 'Раз в квартал', multiplierToMonthly: 1 / 3 },
  { value: '0 9 1 1 *'   as const, label: 'Ежегодно',      short: 'Раз в год',     multiplierToMonthly: 1 / 12 },
] as const

export type ScheduleValue = (typeof SCHEDULE_OPTIONS)[number]['value']

/** Нормализация суммы к месячной */
export function normalizeToMonthly(amount: number, schedule: string): number {
  const opt = SCHEDULE_OPTIONS.find(o => o.value === schedule)
  return amount * (opt?.multiplierToMonthly ?? 1)
}

// ─── Gamification ─────────────────────────────────
export const ACHIEVEMENT_DEFINITIONS = [
  { type: 'first_tx', title: 'Первая транзакция', icon: '🎉' },
  { type: 'tx_10', title: '10 транзакций', icon: '📊' },
  { type: 'tx_100', title: '100 транзакций', icon: '💯' },
  { type: 'tx_500', title: '500 транзакций', icon: '🏆' },
  { type: 'budget_master', title: 'Мастер бюджета', icon: '🎯' },
  { type: 'streak_7', title: '7 дней подряд', icon: '🔥' },
  { type: 'streak_30', title: '30 дней подряд', icon: '⚡' },
  { type: 'goal_reached', title: 'Цель достигнута', icon: '🏅' },
  { type: 'saver', title: 'Экономист', icon: '💰' },
  { type: 'categorizer', title: 'Всё по полочкам', icon: '📁' },
] as const

export const CHALLENGE_TEMPLATES = [
  { type: 'no_spend', title: 'День без трат', target: 1, durationDays: 1, points: 10 },
  { type: 'no_spend_category', title: 'Неделя без кафе', target: 7, durationDays: 7, points: 50 },
  { type: 'budget_limit', title: 'В рамках бюджета', target: 30, durationDays: 30, points: 100 },
  { type: 'savings_target', title: 'Копилка 10%', target: 10, durationDays: 30, points: 75 },
  { type: 'streak_keep', title: 'Ежедневный учёт', target: 14, durationDays: 14, points: 70 },
] as const

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000] as const

// ─── App ───────────────────────────────────────
export const APP_NAME = 'DreamWallet'
export const APP_DESCRIPTION = 'Управление личными и бизнес-финансами'
