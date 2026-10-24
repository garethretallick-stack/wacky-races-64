// Wacky Races 64 app updater and offline cache.
// The game page itself is fetched fresh from GitHub Pages on every launch, so whatever was
// uploaded last is what everyone plays; the cached copy is only used when there's no internet.
// Libraries, fonts and instrument samples never change, so they come from the cache first.
const CACHE = 'wr64';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const FOREVER = /(^|\.)(cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|gleitz\.github\.io)$/;

self.addEventListener('install', e => {
  self.skipWaiting();
  // one file failing to download must never stop the app installing
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const keep = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // newest version first, cached copy when offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => keep(req, res)).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')).then(r => r || caches.match('./'))));
  } else if (FOREVER.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => keep(req, res))));
  }
});
