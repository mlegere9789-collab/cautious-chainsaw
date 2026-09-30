// Service worker with asset caching (fixes FCP/LCP for repeat visitors)
// Update CACHE_NAME when deploying new assets to bust the cache.
const CACHE_NAME = 'gbg-v5';

const PRECACHE_ASSETS = [
  '/assets/index-Cg8FAMXN.js',
  '/assets/index-B4G7Z_2G.css',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// Install: cache critical assets immediately
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

// Fetch: cache-first for precached assets, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Cache-first for hashed assets (they never change)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // Cache-first for icons and static files
  if (PRECACHE_ASSETS.some(a => url.pathname === a)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }

  // Data files: network-first (always fresh when online), but cache each
  // successful response so the app still works with no connection.
  // Online behavior is unchanged -- network is still tried first, every time.
  if (url.pathname.startsWith('/data/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-first for HTML (always fresh)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
