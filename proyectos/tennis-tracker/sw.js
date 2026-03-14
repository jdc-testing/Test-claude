const CACHE_NAME = 'tennis-tracker-v6';

// Assets locales a cachear
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
];

// URLs externas que nunca se cachean (Supabase, CDN, Google Auth)
const NO_CACHE_PATTERNS = [
  'supabase.co',
  'supabase.io',
  'googleapis.com',
  'accounts.google.com',
  'cdn.jsdelivr.net',
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

// Network-first: las requests a Supabase/Google siempre van a la red
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Peticiones de API/auth: directo a la red, sin cachear
  if (shouldSkipCache(url)) {
    e.respondWith(fetch(e.request));
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
