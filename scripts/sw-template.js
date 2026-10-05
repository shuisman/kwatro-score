/* Kwatro Score service worker. Generated at build time by scripts/prerender.mjs; do not edit dist/sw.js. */
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const PRECACHE = __PRECACHE__;
const CACHE = `kwatro-score-${VERSION}`;

self.addEventListener('install', (event) => {
  // Everything, including the HTML, so the app also starts offline.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('kwatro-score-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// The page asks for this when the user taps "Refresh" on the update banner.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        let path = url.pathname.replace(/index\.html$/, '');
        if (!path.endsWith('/')) path += '/';
        // Prerendered page, else the SPA shell (dynamic routes like a game id), else the network.
        const opts = { ignoreSearch: true, ignoreVary: true };
        const hit = (await cache.match(path, opts)) || (await cache.match(`${BASE}404.html`, opts));
        if (hit) return hit;
        return fetch(req);
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      return hit || fetch(req);
    })(),
  );
});
