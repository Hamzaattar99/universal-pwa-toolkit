// src/core/sw-runtime/cache-strategies.js
//
// Runs INSIDE the service worker (no `window`, no DOM). Implements the three
// caching strategies the config can select. Each strategy is a plain
// function so they're easy to test in isolation and easy to read end to end.
//
// Safety rules applied by ALL strategies (see Phase 1 security section):
//  - only GET requests are cached; never cache mutating requests.
//  - responses with `Cache-Control: no-store` or `private` are never cached.
//  - requests matching config.cache.excludePatterns are never cached and are
//    always passed straight to the network (e.g. auth/personalized APIs).

export function isCacheable(request, response) {
  if (request.method !== 'GET') return false;
  if (!response || !response.ok) return false;
  const cacheControl = response.headers.get('Cache-Control') || '';
  if (/no-store/i.test(cacheControl) || /private/i.test(cacheControl)) return false;
  return true;
}

export function matchesExcludePattern(url, excludePatterns = []) {
  return excludePatterns.some((pattern) => {
    // Patterns are simple strings supporting a single trailing '*' wildcard,
    // e.g. "/api/auth/*" - kept intentionally simple rather than pulling in
    // a full path-matching library for something this small.
    if (pattern.endsWith('*')) {
      return url.startsWith(pattern.slice(0, -1));
    }
    return url === pattern;
  });
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Delete oldest entries first (insertion order approximates age).
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

export async function cacheFirst(request, { cacheName, maxEntries }) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(request, response)) {
    await cache.put(request, response.clone());
    trimCache(cacheName, maxEntries);
  }
  return response;
}

export async function networkFirst(request, { cacheName, maxEntries, timeoutMs = 4000 }) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), timeoutMs)),
    ]);
    if (isCacheable(request, response)) {
      await cache.put(request, response.clone());
      trimCache(cacheName, maxEntries);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

export async function staleWhileRevalidate(request, { cacheName, maxEntries }) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (isCacheable(request, response)) {
        cache.put(request, response.clone());
        trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => null); // background revalidation failures are non-fatal

  return cached || networkFetch;
}

export function getStrategy(name) {
  switch (name) {
    case 'cache-first':
      return cacheFirst;
    case 'stale-while-revalidate':
      return staleWhileRevalidate;
    case 'network-first':
    default:
      return networkFirst;
  }
}
