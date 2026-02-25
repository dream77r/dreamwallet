import 'server-only'

import { cache } from 'react'
import { createHydrationHelpers } from '@trpc/react-query/rsc'
import { createCallerFactory } from '@/server/trpc'
import { makeQueryClient } from './query-client'
import { appRouter, type AppRouter } from '@/server/routers/_app'
import { createContext } from '@/server/trpc'

export const getQueryClient = cache(makeQueryClient)

const callerFactory = createCallerFactory(appRouter)
const caller = callerFactory(createContext)

export const { trpc: serverTrpc, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
)
