// Service worker : cache-first pour l'app shell et les images,
// stale-while-revalidate pour data/cards.json.
// Incrémenter VERSION à chaque déploiement qui modifie l'app shell.

const VERSION = 'v5';
const CACHE = `scrollus-${VERSION}`;
const DATA_PATH = 'data/cards.json';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/cards.js',
  'js/data-source.js',
  'js/feed.js',
  'js/icons.js',
  'js/srs.js',
  'js/storage.js',
  'js/ui.js',
  'fonts/cormorant-garamond-500-normal.woff2',
  'fonts/cormorant-garamond-500-italic.woff2',
  'fonts/cormorant-garamond-700-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'images/lat-002.webp',
  DATA_PATH,
];

// cache: 'reload' contourne le cache HTTP (GitHub Pages) pour ne pas figer d'anciens fichiers.
// skipWaiting active la nouvelle version tout de suite : la page se recharge seule.
self.addEventListener('install', (event) => {
  const requests = SHELL.map((path) => new Request(path, { cache: 'reload' }));
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(requests))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('scrollus-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

// Navigation : l'app shell en cache d'abord, quelle que soit l'URL demandée.
async function navigation(request) {
  const cached = (await caches.match(request, { ignoreSearch: true })) || (await caches.match('index.html'));
  return cached || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.endsWith(DATA_PATH)) {
    event.respondWith(staleWhileRevalidate(request, event));
  } else if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
