// UTOPIAN Transfer v7 - Service Worker
const CACHE_NAME = 'utopian-transfer-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/data.js',
  './js/algo.js',
  './js/ui.js',
  './js/history.js',
  './js/perf.js',
  './js/init.js',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // CDN ve external request'leri network-first
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
