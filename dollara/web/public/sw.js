/* Service worker for the installable PWA.
 *
 * Deliberately conservative: this is an authenticated, live gaming app, so we
 * never cache API responses or HTML documents (that would risk serving one
 * user's page/balance to another, or stale odds). We only:
 *   - precache a small offline fallback page + the app icons, and
 *   - cache-first the immutable Next build assets (/_next/static/*), which are
 *     content-hashed and safe to keep forever.
 * Everything else falls through to the network; navigations that fail offline
 * get the fallback page. Providing a fetch handler + offline response is also
 * what lets Chrome offer the richer "install" experience.
 */
const VERSION = 'v1';
const CACHE = `app-shell-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only ever touch same-origin GETs. Product API, websockets, analytics, etc.
  // are cross-origin (or /api on this origin) and must always hit the network.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Immutable, content-hashed build assets: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Page navigations: network-first, fall back to the offline page when offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
