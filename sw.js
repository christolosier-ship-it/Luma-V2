/**
 * sw.js — Service Worker for Luma PWA
 * Caches all essential assets for offline use
 */

const CACHE_NAME = 'luma-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/utils.js',
  '/js/intakes.js',
  '/js/today.js',
  '/js/calendar.js',
  '/js/medications.js',
  '/js/settings.js',
  '/js/modal.js',
  '/js/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,500;1,300&display=swap',
];

// Install: cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for others
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache new successful responses for our origin
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback: return index.html for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
