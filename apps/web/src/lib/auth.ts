import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@dreamwallet/db'

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
          // Create personal wallet + FREE subscription on first sign-up
          await prisma.wallet.create({
            data: {
              userId: user.id,
              name: 'Личный кошелёк',
              type: 'PERSONAL',
              currency: 'RUB',
            },
          })
          await prisma.subscription.create({
            data: {
              userId: user.id,
              plan: 'FREE',
              status: 'ACTIVE',
            },
          })
        },
      },
    },
  },
})

export type Auth = typeof auth
