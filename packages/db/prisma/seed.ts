import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@dreamwallet.app' },
    update: {},
    create: {
      email: 'demo@dreamwallet.app',
      name: 'Demo User',
      emailVerified: true,
      currency: 'RUB',
      timezone: 'Europe/Moscow',
      locale: 'ru',
    },
  })

  // Create personal wallet
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name: 'Личный кошелёк',
      type: 'PERSONAL',
      currency: 'RUB',
    },
  })

  // Create accounts
  const bankAccount = await prisma.account.upsert({
    where: { id: 'seed-bank-account' },
    update: {},
    create: {
      id: 'seed-bank-account',
      walletId: wallet.id,
      name: 'Тинькофф Black',
      type: 'BANK_ACCOUNT',
      currency: 'RUB',
      balance: 156000,
      initialBalance: 50000,
      icon: '🏦',
      color: '#FFD700',
      sortOrder: 0,
    },
  })

  const cashAccount = await prisma.account.upsert({
    where: { id: 'seed-cash-account' },
    update: {},
    create: {
      id: 'seed-cash-account',
      walletId: wallet.id,
      name: 'Наличные',
      type: 'CASH',
      currency: 'RUB',
      balance: 12500,
      initialBalance: 0,
      icon: '💵',
      color: '#22C55E',
      sortOrder: 1,
    },
  })

  // Create default categories
  const expenseCategories = [
    { name: 'Еда и рестораны', icon: '🍕', color: '#F59E0B' },
    { name: 'Транспорт', icon: '🚗', color: '#3B82F6' },
    { name: 'Жильё', icon: '🏠', color: '#8B5CF6' },
    { name: 'Коммунальные', icon: '💡', color: '#6366F1' },
    { name: 'Здоровье', icon: '💊', color: '#EF4444' },
    { name: 'Развлечения', icon: '🎬', color: '#F97316' },
    { name: 'Подписки', icon: '📱', color: '#06B6D4' },
    { name: 'Прочее', icon: '📦', color: '#94A3B8' },
  ]

  const incomeCategories = [
    { name: 'Зарплата', icon: '💰', color: '#22C55E' },
    { name: 'Фриланс', icon: '💻', color: '#10B981' },
    { name: 'Инвестиции', icon: '📈', color: '#34D399' },
  ]

  const createdCategories: Record<string, string> = {}

  // Delete existing categories for idempotency
  await prisma.category.deleteMany({ where: { userId: user.id } })

  for (const [i, cat] of expenseCategories.entries()) {
    const c = await prisma.category.create({
      data: { userId: user.id, ...cat, type: 'EXPENSE', isDefault: true, sortOrder: i },
    })
    createdCategories[cat.name] = c.id
  }

  for (const [i, cat] of incomeCategories.entries()) {
    const c = await prisma.category.create({
      data: { userId: user.id, ...cat, type: 'INCOME', isDefault: true, sortOrder: i },
    })
    createdCategories[cat.name] = c.id
  }

  // Create sample transactions
  const now = new Date()
  const sampleTransactions = [
    { type: 'INCOME', amount: 180000, description: 'Зарплата за январь', category: 'Зарплата', days: -5 },
    { type: 'EXPENSE', amount: 4500, description: 'Яндекс.Еда', category: 'Еда и рестораны', days: -1 },
    { type: 'EXPENSE', amount: 2100, description: 'Метро + такси', category: 'Транспорт', days: -2 },
    { type: 'EXPENSE', amount: 35000, description: 'Аренда квартиры', category: 'Жильё', days: -3 },
    { type: 'EXPENSE', amount: 6800, description: 'ЖКУ', category: 'Коммунальные', days: -4 },
    { type: 'EXPENSE', amount: 1500, description: 'Spotify + YouTube', category: 'Подписки', days: -6 },
    { type: 'INCOME', amount: 45000, description: 'Фриланс проект', category: 'Фриланс', days: -10 },
    { type: 'EXPENSE', amount: 3200, description: 'Аптека', category: 'Здоровье', days: -7 },
    { type: 'EXPENSE', amount: 2800, description: 'Кино + бар', category: 'Развлечения', days: -8 },
    { type: 'EXPENSE', amount: 1900, description: 'Доставка продуктов', category: 'Еда и рестораны', days: -9 },
  ]

  for (const tx of sampleTransactions) {
    const date = new Date(now)
    date.setDate(date.getDate() + tx.days)

    await prisma.transaction.create({
      data: {
        accountId: bankAccount.id,
        type: tx.type as 'INCOME' | 'EXPENSE',
        amount: tx.amount,
        date,
        description: tx.description,
        categoryId: createdCategories[tx.category] || null,
        source: 'MANUAL',
      },
    })
  }

  // Seed plan configs (upsert so re-running is safe)
  const planConfigs = [
    {
      plan: 'FREE' as const,
      displayName: 'Бесплатный',
      priceMonthly: 0,
      priceYearly: 0,
      maxAccounts: 3,
      maxProjects: 1,
      maxBankConnections: 0,
      maxProjectMembers: 0,
      transactionHistoryMonths: 6,
      hasAiCategorization: false,
      hasCustomReports: false,
      hasExport: false,
      hasApiAccess: false,
      isVisible: true,
      sortOrder: 0,
    },
    {
      plan: 'PRO' as const,
      displayName: 'Pro',
      priceMonthly: 490,
      priceYearly: 4490,
      maxAccounts: 20,
      maxProjects: -1,
      maxBankConnections: 2,
      maxProjectMembers: 3,
      transactionHistoryMonths: 36,
      hasAiCategorization: true,
      hasCustomReports: true,
      hasExport: true,
      hasApiAccess: false,
      isVisible: true,
      sortOrder: 1,
    },
    {
      plan: 'BUSINESS' as const,
      displayName: 'Business',
      priceMonthly: 1490,
      priceYearly: 13900,
      maxAccounts: -1,
      maxProjects: -1,
      maxBankConnections: -1,
      maxProjectMembers: -1,
      transactionHistoryMonths: -1,
      hasAiCategorization: true,
      hasCustomReports: true,
      hasExport: true,
      hasApiAccess: true,
      isVisible: true,
      sortOrder: 2,
    },
    {
      plan: 'CUSTOM' as const,
      displayName: 'Custom',
      priceMonthly: 0,
      priceYearly: 0,
      maxAccounts: -1,
      maxProjects: -1,
      maxBankConnections: -1,
      maxProjectMembers: -1,
      transactionHistoryMonths: -1,
      hasAiCategorization: true,
      hasCustomReports: true,
      hasExport: true,
      hasApiAccess: true,
      isVisible: false, // hidden from landing page, admin-only
      sortOrder: 3,
    },
  ]

  for (const config of planConfigs) {
    await prisma.planConfig.upsert({
      where: { plan: config.plan },
      update: config,
      create: config,
    })
  }
  console.log('  PlanConfigs: 4 plans seeded (FREE, PRO, BUSINESS, CUSTOM)')

  // Create subscription
  await prisma.subscription.upsert({
    where: { id: 'seed-subscription' },
    update: {},
    create: {
      id: 'seed-subscription',
      userId: user.id,
      plan: 'FREE',
      status: 'ACTIVE',
    },
  })

  // Create a demo project
  const project = await prisma.project.upsert({
    where: { id: 'seed-project' },
    update: {},
    create: {
      id: 'seed-project',
      ownerId: user.id,
      name: 'Кофейня "Dream Coffee"',
      description: 'Сеть кофеен',
      icon: '☕',
      color: '#8B4513',
      currency: 'RUB',
      status: 'ACTIVE',
    },
  })

  await prisma.wallet.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      name: 'Dream Coffee — кошелёк',
      type: 'PROJECT',
      currency: 'RUB',
    },
  })

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: user.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      role: 'OWNER',
      joinedAt: new Date(),
    },
  })

  console.log('Seed complete!')
  console.log(`  User: ${user.email}`)
  console.log(`  Wallet: ${wallet.name}`)
  console.log(`  Accounts: ${bankAccount.name}, ${cashAccount.name}`)
  console.log(`  Categories: ${Object.keys(createdCategories).length}`)
  console.log(`  Transactions: ${sampleTransactions.length}`)
  console.log(`  Project: ${project.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
