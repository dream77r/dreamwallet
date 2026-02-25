import { initTRPC, TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import { prisma } from '@dreamwallet/db'
import { auth } from '@/lib/auth'
import superjson from 'superjson'

export type Context = {
  prisma: typeof prisma
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null
  user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user'] | null
}

export async function createContext(): Promise<Context> {
  let session: Context['session'] = null

  try {
    const headerList = await headers()
    session = await auth.api.getSession({
      headers: headerList,
    })
  } catch {
    // No session — user is not authenticated
  }

  return {
    prisma,
    session,
    user: session?.user || null,
  }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error ? error.cause.message : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
export const createCallerFactory = t.createCallerFactory

// Auth middleware — requires authenticated user
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Необходима авторизация',
    })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)
