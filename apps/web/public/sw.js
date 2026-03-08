// DreamWallet Service Worker
// Strategies: Cache First (static), Network First (API), Stale While Revalidate (pages)
// + Background Sync for offline transactions

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `dreamwallet-static-${CACHE_VERSION}`
const API_CACHE = `dreamwallet-api-${CACHE_VERSION}`
const PAGES_CACHE = `dreamwallet-pages-${CACHE_VERSION}`

const PRECACHE_URLS = ['/', '/dashboard', '/offline.html']

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, API_CACHE, PAGES_CACHE]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin + http(s)
  if (!request.url.startsWith('http')) return

  // Cache First: static assets
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Network First: API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Stale While Revalidate: dashboard pages
  if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE))
    return
  }

  // Default: network with offline fallback
  event.respondWith(networkWithOfflineFallback(request))
})

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'new-transaction') {
    event.waitUntil(flushTransactionQueue())
  }
})

async function flushTransactionQueue() {
  const db = await openDB()
  const transactions = await getAllPending(db)

  for (const tx of transactions) {
    try {
      const res = await fetch('/api/trpc/transactions.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx.payload),
      })
      if (res.ok) {
        await deletePending(db, tx.id)
      }
    } catch {
      // Will retry on next sync
    }
  }
}

// ── IndexedDB helpers for Background Sync queue ───────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('dreamwallet-sync', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly')
    const req = tx.objectStore('pending').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite')
    const req = tx.objectStore('pending').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── Cache Strategies ──────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  return cached || fetchPromise || offlineFallback()
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request)
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return offlineFallback()
  }
}

async function offlineFallback() {
  const cached = await caches.match('/offline.html')
  return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
}

// ── Push Notifications (preserved from original) ──────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'DreamWallet', body: event.data.text() }
  }
  const { title = 'DreamWallet', body = '', icon = '/icons/icon-192x192.png', url = '/dashboard' } = payload
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-96x96.png',
      data: { url },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Skip Waiting on demand ────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
