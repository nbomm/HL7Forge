/*
 * HL7Forge service worker: lets the installed app open offline.
 * It caches only the app's own static files (listed below), never message data: the page never sends
 * messages anywhere, and this worker only ever sees requests for these same-origin files.
 * Network-first, so a reachable server always wins and updates show up without a cache-version bump.
 */
const CACHE = 'hl7forge-shell';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/theme-init.js', 'js/hl7-definitions.js', 'js/hl7-parser.js', 'js/samples.js', 'js/version.js', 'js/app.js', 'js/pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then(function (res) {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (cache) { cache.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
    })
  );
});
