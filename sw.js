const CACHE_NAME = 'firehydrant-v1';
const STATIC_ASSETS = [
  '/FireHydrant/',
  '/FireHydrant/index.html',
  '/FireHydrant/manifest.json',
  '/FireHydrant/apple-touch-icon.png',
  '/FireHydrant/favicon.ico',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js'
];

// Installation - mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Cache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Toujours aller en ligne pour Supabase et OSRM (données en temps réel)
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('osrm.org') ||
      url.hostname.includes('nominatim.openstreetmap.org') ||
      url.hostname.includes('tile.openstreetmap.org')) {
    return;
  }

  // Pour les autres ressources : cache d'abord, réseau ensuite
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Hors ligne : retourner la page principale en fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/FireHydrant/index.html');
        }
      });
    })
  );
});
