// Keeps a copy of the game on the phone after the first visit, so reopening
// the link starts instantly (and works on a weak signal).
// Updates: the page is shown from the copy right away while a fresh one is
// fetched in the background; the new version appears on the next launch.
const VERSION = 'dev'; // replaced with a unique id by scripts/build.mjs
const CACHE = `diaperman-${VERSION}`;
const CORE = ['./', './vendor/phaser-diaperman-3.80.1.min.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('diaperman-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only this site's own files; leaderboard/Firebase traffic goes straight to the network
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // The engine file never changes (its name has the version in it): copy first
  if (url.pathname.includes('/vendor/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetchAndStore(req)));
    return;
  }

  // The page and everything else: copy now, refresh in the background
  const isPage = req.mode === 'navigate';
  const key = isPage ? new Request('./') : req;
  event.respondWith(
    caches.match(key, { ignoreSearch: isPage }).then((hit) => {
      const fresh = fetchAndStore(req, key).catch(() => hit);
      if (hit) {
        event.waitUntil(fresh);
        return hit;
      }
      return fresh;
    }),
  );
});

function fetchAndStore(req, key = req) {
  return fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(key, copy));
    }
    return res;
  });
}
