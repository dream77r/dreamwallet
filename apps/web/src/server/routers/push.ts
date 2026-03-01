import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import webpush from 'web-push'

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@dreamwallet.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  )
}

// Helper: send push to all subscriptions for a user
export async function sendPushToUser(
  prisma: Parameters<typeof webpush.sendNotification>[0] extends never ? never : any,
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string },
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  const data = JSON.stringify(payload)

  await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string; id: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      ).catch(async (err: { statusCode?: number }) => {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null)
        }
      }),
    ),
  )
}

export const pushRouter = router({
  // Get VAPID public key for client-side subscription
  getPublicKey: protectedProcedure.query(() => {
    return { publicKey: VAPID_PUBLIC_KEY }
  }),

  // Save push subscription from browser
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        },
        update: {
          userId: ctx.user.id,
          p256dh: input.p256dh,
          auth: input.auth,
        },
      })
      return { ok: true }
    }),

  // Remove push subscription
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.deleteMany({
        where: { userId: ctx.user.id, endpoint: input.endpoint },
      })
      return { ok: true }
    }),

  // Check if user has active subscriptions
  isSubscribed: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.pushSubscription.count({ where: { userId: ctx.user.id } })
    return { subscribed: count > 0 }
  }),

  // Send test notification
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    await sendPushToUser(ctx.prisma, ctx.user.id, {
      title: 'DreamWallet 💰',
      body: 'Push-уведомления работают!',
      url: '/dashboard',
    })
    return { ok: true }
  }),
})
