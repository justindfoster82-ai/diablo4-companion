// Hellforge service worker.
// - Season data (./data/seasons/*.json): network-first, so a pushed season file lands on next open.
// - App shell: stale-while-revalidate (instant load, refreshed in the background).
const VERSION = 'hellforge-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './styles/theme.css', './styles/layout.css', './styles/animations.css',
  './src/app.js', './src/state.js', './src/embers.js', './src/crests.js', './src/components/classSlider.js', './src/components/panZoom.js',
  './src/views/builds.js', './src/views/skillTree.js', './src/views/paragon.js', './src/views/tierList.js', './src/views/season.js',
  './assets/icons/icon.svg', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png',
  './data/seasons/index.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.includes('/data/seasons/')) {
    e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const cached = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || net;
  }));
});
