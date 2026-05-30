const CACHE_NAME = 'luma-v3.5.4';
const ASSETS = ['./','./index.html','./css/style.css','./js/db.js','./js/utils.js','./js/intakes.js','./js/today.js','./js/dailyEntryModals.js','./js/timeline.js','./js/journal.js','./js/medications.js','./js/settings.js','./js/modal.js','./js/app.js','./manifest.json','./icons/icone_192x192.png','./icons/icone_512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    for (const asset of ASSETS) {
      try { await cache.add(asset); } catch (_) {}
    }
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('luma-v') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate' || new URL(event.request.url).pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        return response;
      });
    })
  );
});
