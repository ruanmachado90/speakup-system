const CACHE = 'speakup-v4';
const OFFLINE_URLS = ['/', '/professor-login', '/login'];

// Em desenvolvimento (localhost), não fazer nada
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

self.addEventListener('install', event => {
  if (isDev) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Em desenvolvimento, nunca interceptar — deixa tudo passar direto
  if (isDev) return;

  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Nunca interceptar assets JS/CSS
  if (url.pathname.startsWith('/assets/')) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(r => r || Response.error())
    )
  );
});
