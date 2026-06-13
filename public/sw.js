const CACHE_VERSION = 'v1';
const OFFLINE_CACHE = `hoath-offline-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install — just enough to render the offline page
const PRECACHE_ASSETS = [
  '/offline.html',
  '/ho_logo.png',
];

// ── Install: pre-cache the offline page ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Take over immediately — don't wait for old SW to go idle
  self.skipWaiting();
});

// ── Activate: clean up old cache versions ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim all open tabs without requiring a reload
  self.clients.claim();
});

// ── Fetch: network-first; serve offline page for navigation failures ─────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN, ImageKit, etc.)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internal routes and HMR websockets
  if (url.pathname.startsWith('/_next/')) return;

  if (request.mode === 'navigate') {
    // Navigation: try the network; fall back to offline page
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone so we can both use the response and return it
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For everything else (API calls, images, etc.): network only
  // We don't cache API responses — they contain sensitive data
});
