// Minimal offline cache for Aerobin — caches shell + data, not live PM2.5
const CACHE = 'aerobin-v1'
const ASSETS = ['/', '/index.html', '/leaf.svg', '/manifest.json', '/data/aerobin_data.json', '/data/pune-admin-wards.geojson']
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Never cache live PM2.5
  if (url.hostname.includes('openweathermap.org')) return
  // Cache-first for same-origin data + navigate fallback to index.html
  if (url.pathname.startsWith('/data/') || e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        const copy = r.clone()
        caches.open(CACHE).then(c=>c.put(e.request, copy))
        return r
      }).catch(()=> caches.match('/index.html')))
    )
  }
})
