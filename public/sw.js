// ==============================================================================
// QHSSE Consultant - Progressive Web App Service Worker (v1.0.0)
// High-reliability offline cache & field inspection support
// ==============================================================================

const CACHE_NAME = 'qhsse-portal-v1'
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/public/locales/ar.json',
  '/public/locales/en.json',
]

// 1. Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching partial failure (safe to proceed):', err)
      })
    })
  )
  self.skipWaiting()
})

// 2. Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// 3. Fetch Event: Stale-While-Revalidate for assets, Network-First for dynamic pages
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Skip non-GET requests (e.g. POST/PUT/DELETE for reports and uploads)
  if (req.method !== 'GET') {
    return
  }

  // Handle Chrome extension schemes or non-http
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Strategy A: Static Assets (_next/static, fonts, icons, images) -> Cache First with Revalidate
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Revalidate in background
          fetch(req)
            .then((fresh) => {
              if (fresh && fresh.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(req, fresh))
              }
            })
            .catch(() => {})
          return cached
        }
        return fetch(req).then((fresh) => {
          if (fresh && fresh.status === 200) {
            const clone = fresh.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          }
          return fresh
        })
      })
    )
    return
  }

  // Strategy B: API GET requests (e.g. clients list for offline selection) -> Network first with cache fallback
  if (url.pathname.startsWith('/api/clients') || url.pathname.startsWith('/api/dashboard')) {
    event.respondWith(
      fetch(req)
        .then((fresh) => {
          if (fresh && fresh.status === 200) {
            const clone = fresh.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          }
          return fresh
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached
            return new Response(JSON.stringify({ offline: true, error: 'Offline - showing cached data' }), {
              headers: { 'Content-Type': 'application/json' },
            })
          })
        })
    )
    return
  }

  // Strategy C: HTML Pages (Navigation) -> Network First, fallback to Cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((fresh) => {
          if (fresh && fresh.status === 200) {
            const clone = fresh.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          }
          return fresh
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached
            // Fallback to cached home page
            return caches.match('/')
          })
        })
    )
    return
  }
})

// 4. Background Sync / Push Placeholder
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
