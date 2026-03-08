'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function ServiceWorkerRegistration() {
  const waitingRef = useRef<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for waiting SW on load (user refreshed after update)
        if (registration.waiting) {
          waitingRef.current = registration.waiting
          showUpdateToast()
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingRef.current = newWorker
              showUpdateToast()
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })

    // When SW activates after skipWaiting — reload
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  function showUpdateToast() {
    toast('Доступно обновление', {
      description: 'Новая версия DreamWallet готова к установке',
      duration: Infinity,
      action: {
        label: 'Обновить',
        onClick: () => {
          if (waitingRef.current) {
            waitingRef.current.postMessage({ type: 'SKIP_WAITING' })
          }
        },
      },
    })
  }

  return null
}
