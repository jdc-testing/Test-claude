const CACHE_NAME = 'tennis-tracker-v8';

// Assets locales (críticos — SW no instala si fallan)
const LOCAL_ASSETS = [
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
];

// URL exacta del script CDN en index.html (se cachea best-effort, no bloquea install)
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

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
    caches.open(CACHE_NAME).then(c =>
      // Assets locales: críticos (fallo aquí impide el install)
      c.addAll(LOCAL_ASSETS).then(() =>
        // CDN de Supabase: best-effort (no bloquea el install si la red falla)
        fetch(CDN_SUPABASE)
          .then(res => c.put(CDN_SUPABASE, res))
          .catch(() => {})
      )
    )
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

  // Supabase JS (CDN): cache-first + revalidación en background
  // Evita bloquear el arranque en mobile con red lenta
  if (url === CDN_SUPABASE) {
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
