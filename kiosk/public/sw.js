const CACHE_NAME = 'thomian-lib-v3.7.21';
// Only precache static assets that rarely change — NOT HTML
const PRECACHE_URLS = [
  '/manifest.json',
  '/school-logo.svg'
];

// Install: Cache static assets then activate immediately (auto-update)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: Wipe ALL caches (self-healing from stale HTML poisoning),
// then notify every open tab so it can show an update banner. The app
// decides when to reload — no forced navigation that would disrupt patrons.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => {
      // Rebuild fresh precache
      return caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}));
    })
  );
  // Post message to all clients — each app shows its own update banner
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      })
    )
  );
});

// Fetch: Network-only for HTML, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Navigation (HTML): ALWAYS network-first — never serve stale HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html') || new Response('Offline', { status: 503 })));
    return;
  }

  // 2. External CDNs: Stale-while-revalidate
  if (
    url.hostname.includes('esm.sh') ||
    url.hostname.includes('tailwindcss.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. API Requests (Workers): Network Only
  // Ensure we never serve stale data for configuration or records
  if (url.hostname.includes('workers.dev')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 4. Default Strategy: Cache First, falling back to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
