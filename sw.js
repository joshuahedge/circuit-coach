// Service worker: caches every file in sw-files.js under one cache named by build, fetches each file past
// the HTTP cache so builds never mix, answers same-origin GETs cache-first with a network fallback, and
// drops older caches when it takes over. A waiting worker takes over when the page posts 'skipWaiting'.
importScripts('./sw-files.js');

const CACHE = `coach-${self.COACH_BUILD}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(self.COACH_FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('coach-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/__')) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((hit) => hit || (event.request.mode === 'navigate' ? caches.match('./index.html') : null))
      .then((hit) => hit || fetch(event.request)),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
