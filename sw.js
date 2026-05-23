const CACHE_NAME = 'luma-v2.1.0';
const ASSETS = [
  './','./index.html','./css/style.css','./js/db.js','./js/utils.js','./js/intakes.js','./js/today.js','./js/calendar.js','./js/medications.js','./js/settings.js','./js/modal.js','./js/app.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    for (const url of ASSETS) { try { await cache.add(url); } catch (err) { console.warn('Asset not cached', url, err); } }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === self.location.origin) caches.open(CACHE_NAME).then(cache => cache.put(e.request, r.clone()));
    return r;
  }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)));
});
