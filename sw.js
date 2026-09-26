const prefix = `clearweek:${self.registration.scope}:`;
const cacheName = prefix + 'v1';
const files = ['.', 'index.html', 'styles.css', 'assets/icon.svg', 'manifest.webmanifest',
  'src/app.js', 'src/planner.js', 'src/dates.js', 'src/storage.js', 'src/calendar.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const saved = await cache.match(event.request, { ignoreSearch: true });
    return saved || fetch(event.request);
  }));
});
