'use client'

import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  fetchOptions: {
    onError: (ctx) => {
      // silent auth errors
    },
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
export type Session = typeof authClient.$Infer.Session
