const CACHE_NAME = 'luma-v3.1.0';
const ASSETS = ['./','./index.html','./css/style.css','./js/db.js','./js/utils.js','./js/intakes.js','./js/today.js','./js/timeline.js','./js/journal.js','./js/medications.js','./js/settings.js','./js/modal.js','./js/app.js','./manifest.json'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE_NAME).then(async c => {for (const a of ASSETS) try {await c.add(a);} catch(_) {}}).then(()=>self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', (e) => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=> e.request.mode==='navigate' ? caches.match('./index.html'):undefined))); });
