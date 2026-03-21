const APP_VERSION = 'ojodeloca-pwa-v4';
const SHELL_CACHE = `${APP_VERSION}-shell`;
const RUNTIME_CACHE = `${APP_VERSION}-runtime`;
const OFFLINE_URL = '/offline.html';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/og-image.png',
  '/screenshot-mobile.png',
  OFFLINE_URL,
];

const SAME_ORIGIN = self.location.origin;

function isHttpRequest(request) {
  return request.url.startsWith('http');
}

function isSupabaseRequest(url) {
  return url.hostname.includes('supabase')
    || url.pathname.includes('/auth/v1/')
    || url.pathname.includes('/rest/v1/')
    || url.pathname.includes('/functions/v1/')
    || url.pathname.includes('/storage/v1/');
}

function isVersionedAsset(url) {
  return url.origin === SAME_ORIGIN && url.pathname.startsWith('/assets/');
}

function shouldBypass(request) {
  const url = new URL(request.url);
  const hasAuthHeaders = request.headers.has('authorization') || request.headers.has('apikey');

  return (
    request.method !== 'GET'
    || !isHttpRequest(request)
    || hasAuthHeaders
    || request.url.includes('/api/')
    || request.url.includes('googleapis')
    || request.url.includes('googletagmanager')
    || request.url.includes('gstatic')
    || isSupabaseRequest(url)
  );
}

async function cacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL);
}

async function cleanupOldCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => ![SHELL_CACHE, RUNTIME_CACHE].includes(name))
      .map((name) => caches.delete(name)),
  );
}

async function purgeVersionedAssetsFromRuntimeCache() {
  const runtime = await caches.open(RUNTIME_CACHE);
  const requests = await runtime.keys();

  await Promise.all(
    requests
      .filter((request) => {
        try {
          return isVersionedAsset(new URL(request.url));
        } catch {
          return false;
        }
      })
      .map((request) => runtime.delete(request)),
  );
}

async function networkFirstNavigation(request) {
  const runtime = await caches.open(RUNTIME_CACHE);

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      runtime.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await runtime.match(request);
    if (cached) return cached;

    const shell = await caches.open(SHELL_CACHE);
    return shell.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const fresh = await networkPromise;
  if (fresh) return fresh;

  if (request.destination === 'image') {
    const shell = await caches.open(SHELL_CACHE);
    return shell.match('/icon-192.png');
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await cleanupOldCaches();
    await purgeVersionedAssetsFromRuntimeCache();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (shouldBypass(request)) return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === SAME_ORIGIN;

  // Let the browser handle hashed build assets directly.
  // Caching them here can serve an old bundle that references chunks
  // already removed by the latest deploy.
  if (isVersionedAsset(url)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  if (
    ['style', 'script', 'worker', 'font', 'image'].includes(request.destination)
    || APP_SHELL.includes(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
