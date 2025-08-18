// service-worker.js  (Tattoo Lab v4e)
const CACHE_NAME = 'tattoolab-v4e';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/mask_square.png',
  './assets/mask_splat.png',
  './icons/icon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached ||
      fetch(e.request).then(res => {
        // cache same-origin GET responses for offline
        const copy = res.clone();
        try {
          const url = new URL(e.request.url);
          if (e.request.method === 'GET' && url.origin === location.origin) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
          }
        } catch {}
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
