const CACHE_NAME = 'tattoolab-v4a';
const ASSETS = ['./','./index.html','./manifest.json','./icons/icon-64.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))); });
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    const copy = res.clone(); if (e.request.method === 'GET' && (new URL(e.request.url)).origin === location.origin) {
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
    } return res;
  }).catch(()=>caches.match('./index.html'))));
});
