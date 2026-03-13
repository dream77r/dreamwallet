'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface TelegramContextValue {
  token: string | null
  userId: string | null
  userName: string | null
  isReady: boolean
  isError: boolean
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>
}

const TelegramContext = createContext<TelegramContextValue>({
  token: null,
  userId: null,
  userName: null,
  isReady: false,
  isError: false,
  fetchWithAuth: () => Promise.reject(new Error('Not initialized')),
})

export function useTelegram() {
  return useContext(TelegramContext)
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        // Dynamically import @twa-dev/sdk
        const WebApp = (await import('@twa-dev/sdk')).default
        WebApp.ready()
        WebApp.expand()

        // Apply Telegram theme
        if (WebApp.themeParams.bg_color) {
          document.documentElement.style.setProperty('--tg-bg', WebApp.themeParams.bg_color)
        }

        const initData = WebApp.initData
        if (!initData) {
          setIsError(true)
          return
        }

        const res = await fetch('/api/telegram/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })

        if (!res.ok) {
          setIsError(true)
          return
        }

        const data = await res.json() as { token: string; user: { id: string; name: string } }
        setToken(data.token)
        setUserId(data.user.id)
        setUserName(data.user.name)
        setIsReady(true)
      } catch {
        setIsError(true)
      }
    }

    init()
  }, [])

  const fetchWithAuth = useCallback(async (url: string, init?: RequestInit) => {
    if (!token) throw new Error('Not authenticated')
    return fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  }, [token])

  // Handle back button
  useEffect(() => {
    if (!isReady) return

    async function setupBackButton() {
      const WebApp = (await import('@twa-dev/sdk')).default
      WebApp.BackButton.onClick(() => {
        window.history.back()
      })
    }

    setupBackButton()
  }, [isReady])

  return (
    <TelegramContext.Provider value={{ token, userId, userName, isReady, isError, fetchWithAuth }}>
      {children}
    </TelegramContext.Provider>
  )
}
