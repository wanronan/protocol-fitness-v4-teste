const CACHE = 'protocol-fitness-v4-weekly-reset';
const ASSETS = [
  './',
  './index.html',
  './treino.html',
  './progresso.html',
  './orientacoes.html',
  './css/style.css?v=20260724-1',
  './js/treino-data.js?v=20260724-1',
  './js/storage.js?v=20260724-1',
  './js/app.js?v=20260724-1',
  './js/treino.js?v=20260724-1',
  './js/progresso.js?v=20260724-1',
  './manifest.json?v=20260724-1',
  './assets/icons/protocol-fitness-logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/covers/quadriceps-card-v3.png',
  './assets/covers/push-card-v3.png',
  './assets/covers/posterior-card-v3.png',
  './assets/covers/pull-card-v3.png',
  './assets/covers/completo-card-v3.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
