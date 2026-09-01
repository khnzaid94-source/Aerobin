// Minimal offline cache for Aerobin — caches data for offline use, never live PM2.5.
// Strategy notes:
//  - Navigations + data are NETWORK-FIRST: returning visitors always get the
//    latest deployment (Vite's hashed /assets/* filenames change every build,
//    so a stale cached index.html would reference assets that no longer exist).
//    The cache is only served when the network fails (true offline).
//  - This removes the need to bump a cache-version string on every deploy:
//    the network response always wins, the cache is just an offline fallback.
const CACHE = 'aerobin-v2'
const FALLBACKS = ['/', '/index.html', '/data/aerobin_data.json', '/data/pune-admin-wards.geojson']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FALLBACKS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Never touch live PM2.5 or cross-origin requests.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/data/') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
          return res
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match('/index.html'))
        )
    )
  }
})
