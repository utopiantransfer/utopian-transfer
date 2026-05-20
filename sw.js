// UTOPIAN Transfer v8.1.2 - Service Worker (CACHE BYPASS)
const CACHE_NAME = 'utopian-transfer-v8.1.2-' + Date.now();

self.addEventListener('install', e => {
  // Eski cache'i hemen temizle, yeni dosyaları yükleme
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))  // TÜM cache'i sil
    )).then(() => self.clients.claim())
  );
});

// Network-first stratejisi - hep güncel dosya al
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
