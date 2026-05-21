// Service Worker DEVRE DIŞI - tüm cache'i temizle
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Hiçbir şeyi cache'leme — hep network'ten al
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request)); });
