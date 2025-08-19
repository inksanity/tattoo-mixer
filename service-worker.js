// Tattoo Lab PWA Service Worker
// Strategy: cache-first with runtime update + offline fallback to index.html

const CACHE_NAME = 'tattoolab-v5d3h'; // bump this to force refresh

// Core assets to precache (add anything else you want guaranteed offline)
const ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.json',
  './config.js',
  // Icons & assets (create these files if they don't exist yet)
  './icons/icon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/mask_square.png',
  './assets/mask_splat.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResp) => {
          // Update cache in background (same-origin only)
          try {
            const url = new URL(event.request.url);
            if (url.origin === location.origin) {
              const copy = networkResp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          } catch (_) {}
          return networkResp;
        })
        .catch(() => {
          // Offline fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Or fallback to whatever we have cached
          return cached || new Response('', { status: 503, statusText: 'Offline' });
        });

      // Cache-first: serve cache immediately, then update in background
      return cached || fetchPromise;
    })
  );
});
