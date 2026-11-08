const CACHE = 'protocol-fitness-v6-20261108';
const CORE = [
  './','./index.html','./treino.html','./progresso.html','./orientacoes.html',
  './css/style.css?v=20261108-v6','./js/treino-data.js?v=20261108-v6',
  './js/storage.js?v=20261108-v6','./js/profile.js?v=20261108-v6',
  './js/app.js?v=20261108-v6','./js/treino.js?v=20261108-v6','./js/progresso.js?v=20261108-v6',
  './manifest.json?v=20261108-v6','./assets/icons/protocol-fitness-logo.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png',
  './assets/covers/quadriceps-card-v3.png','./assets/covers/push-card-v3.png','./assets/covers/posterior-card-v3.png','./assets/covers/pull-card-v3.png','./assets/covers/completo-card-v3.png',
  './assets/exercises/leg-press-45.webp','./assets/exercises/cadeira-extensora.webp','./assets/exercises/panturrilha-leg.webp',
  './assets/exercises/supino-reto.webp','./assets/exercises/remada-articulada.webp','./assets/exercises/puxada-alta.webp',
  './assets/exercises/desenvolvimento-maquina.webp','./assets/exercises/elevacao-lateral.webp','./assets/exercises/triceps-pulley-v.webp',
  './assets/exercises/rosca-inclinada.webp','./assets/exercises/mesa-flexora.webp','./assets/exercises/elevacao-pelvica.webp',
  './assets/exercises/abdutora.webp','./assets/exercises/supino-inclinado.webp','./assets/exercises/panturrilha-sentada.webp'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return response})));
});
