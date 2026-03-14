const CACHE_NAME = 'tennis-tracker-v7';

// Assets locales a cachear en el install
const ASSETS = [
  './index.html',
  './manifest.json',
  './sw.js',
  './js/config.js',
  './js/state.js',
  './js/tennis-logic.js',
  './js/ui.js',
  './js/data.js',
  './js/auth.js',
  './js/realtime.js',
  './js/match.js',
  './js/render.js',
  './js/app.js',
  // Supabase JS client (CDN) — se pre-cachea para que no bloquee en mobile
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// URLs de API/auth que NUNCA se cachean (siempre red directa)
const NO_CACHE_PATTERNS = [
  'supabase.co',
  'supabase.io',
  'googleapis.com',
  'accounts.google.com',
];

function shouldSkipCache(url) {
  return NO_CACHE_PATTERNS.some(p => url.includes(p));
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Peticiones de API/auth: directo a la red, sin cachear nunca
  if (shouldSkipCache(url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Scripts CDN (supabase-js): cache-first + actualización en segundo plano
  // Evita bloquear el arranque en mobile con red lenta
  if (url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Assets locales: network-first con fallback a caché
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
