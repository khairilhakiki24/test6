// Mengubah versi cache ke v4 untuk memastikan browser mengunduh versi HTML terbaru
const CACHE_NAME = 'BejajaCafePOS-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
  // CDN Libraries (Cached for Offline)
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/lucide@latest'
];

// Install Event - Precache Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching Assets');
        return Promise.allSettled(
            ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate & Offline Fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (!event.request.url.startsWith(self.location.origin) && !ASSETS_TO_CACHE.includes(event.request.url)) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          event.waitUntil(
            fetch(event.request).then(networkResponse => {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }).catch(() => {}) 
          );
          return cachedResponse;
        }

        return fetch(event.request).then(networkResponse => {
           if(event.request.url.startsWith(self.location.origin) && networkResponse.ok) {
               const clonedRes = networkResponse.clone();
               caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedRes));
           }
           return networkResponse;
        }).catch(err => {
            console.log('[Service Worker] Offline & No Cache Found', err);
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
            throw err;
        });
      })
  );
});