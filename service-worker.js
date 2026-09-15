const CACHE = 'protocol-fitness-v4-premium-exercicios-v3';
const ASSETS = [
  './',
  './index.html',
  './treino.html',
  './progresso.html',
  './orientacoes.html',
  './css/style.css?v=20260915-3',
  './js/treino-data.js?v=20260915-3',
  './js/storage.js?v=20260915-3',
  './js/app.js?v=20260915-3',
  './js/treino.js?v=20260915-3',
  './js/progresso.js?v=20260915-3',
  './manifest.json?v=20260915-3',
  './assets/icons/protocol-fitness-logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/covers/quadriceps-card-v3.png',
  './assets/covers/push-card-v3.png',
  './assets/covers/posterior-card-v3.png',
  './assets/covers/pull-card-v3.png',
  './assets/covers/completo-card-v3.png',
  './assets/exercises/leg-press-45.webp',
  './assets/exercises/hack-squat-articulado.webp',
  './assets/exercises/cadeira-extensora.webp',
  './assets/exercises/adutora.webp',
  './assets/exercises/panturrilha-leg.webp',
  './assets/exercises/supino-inclinado.webp',
  './assets/exercises/peck-deck-superior.webp',
  './assets/exercises/supino-reto.webp',
  './assets/exercises/crucifixo-crossover.webp',
  './assets/exercises/desenvolvimento-maquina.webp',
  './assets/exercises/elevacao-lateral.webp',
  './assets/exercises/triceps-pulley-v.webp',
  './assets/exercises/triceps-frances.webp',
  './assets/exercises/mesa-flexora.webp',
  './assets/exercises/flexora-sentada.webp',
  './assets/exercises/elevacao-pelvica.webp',
  './assets/exercises/leg-press-altos.webp',
  './assets/exercises/abdutora.webp',
  './assets/exercises/panturrilha-sentada.webp',
  './assets/exercises/puxada-alta.webp',
  './assets/exercises/remada-articulada.webp',
  './assets/exercises/remada-unilateral-maquina.webp',
  './assets/exercises/pulldown.webp',
  './assets/exercises/crucifixo-inverso.webp',
  './assets/exercises/rosca-direta.webp',
  './assets/exercises/rosca-inclinada.webp',
  './assets/exercises/rosca-martelo.webp',
  './assets/exercises/leg-press-medios.webp',
  './assets/exercises/cadeira-extensora-sexta.webp',
  './assets/exercises/mesa-flexora-sexta.webp',
  './assets/exercises/elevacao-pelvica-sexta.webp',
  './assets/exercises/panturrilha-sexta.webp'
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
