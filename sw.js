const prefix = `clearweek:${self.registration.scope}:`;
const cacheName = prefix + 'v8';
const files = ['.', 'index.html', 'styles.css', 'assets/icon.svg', 'manifest.webmanifest',
  'src/app.js', 'src/motion.js', 'src/planner.js', 'src/dates.js', 'src/storage.js', 'src/calendar.js',
  'assets/colors.css', 'assets/icons.css', 'assets/fonts/geist.woff2', 'assets/fonts/geist-mono.woff2', 'assets/icons/arrow-up-right.svg', 'assets/icons/calendar-days.svg', 'assets/icons/check.svg', 'assets/icons/chevron-down.svg', 'assets/icons/clock-3.svg', 'assets/icons/list-todo.svg', 'assets/icons/panel-left.svg', 'assets/icons/pencil.svg', 'assets/icons/plus.svg', 'assets/icons/search.svg', 'assets/icons/shield-check.svg', 'assets/icons/sliders-horizontal.svg', 'assets/icons/trash.svg', 'assets/icons/x.svg'];

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
