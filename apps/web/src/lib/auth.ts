import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@dreamwallet/db'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@dreamwallet/shared'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3300',
  ],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cookie cache
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'USER' },
      currency: { type: 'string', defaultValue: 'RUB' },
      timezone: { type: 'string', defaultValue: 'Europe/Moscow' },
      locale: { type: 'string', defaultValue: 'ru' },
    },
  },
  account: {
    modelName: 'oAuthAccount',
    fields: {
      accountId: 'providerAccountId',
      providerId: 'provider',
    },
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create personal wallet + FREE subscription + default categories on first sign-up
          await Promise.all([
            prisma.wallet.create({
              data: {
                userId: user.id,
                name: 'Личный кошелёк',
                type: 'PERSONAL',
                currency: 'RUB',
              },
            }),
            prisma.subscription.create({
              data: {
                userId: user.id,
                plan: 'FREE',
                status: 'ACTIVE',
              },
            }),
            // Create default expense categories
            ...DEFAULT_EXPENSE_CATEGORIES.map((cat, i) =>
              prisma.category.create({
                data: {
                  userId: user.id,
                  name: cat.name,
                  icon: cat.icon,
                  color: cat.color,
                  type: 'EXPENSE',
                  isDefault: true,
                  sortOrder: i,
                },
              })
            ),
            // Create default income categories
            ...DEFAULT_INCOME_CATEGORIES.map((cat, i) =>
              prisma.category.create({
                data: {
                  userId: user.id,
                  name: cat.name,
                  icon: cat.icon,
                  color: cat.color,
                  type: 'INCOME',
                  isDefault: true,
                  sortOrder: i,
                },
              })
            ),
          ])
        },
      },
    },
  },
})

export type Auth = typeof auth
