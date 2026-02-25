import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@dreamwallet/db'

export const auth = betterAuth({
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
      currency: { type: 'string', defaultValue: 'RUB' },
      timezone: { type: 'string', defaultValue: 'Europe/Moscow' },
      locale: { type: 'string', defaultValue: 'ru' },
    },
  },
  account: {
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
  callbacks: {
    // Create personal wallet + default categories on first sign-up
    async onUserCreated(user: { id: string }) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          name: 'Личный кошелёк',
          type: 'PERSONAL',
          currency: 'RUB',
        },
      })

      // Create FREE subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      })
    },
  },
})

export type Auth = typeof auth
