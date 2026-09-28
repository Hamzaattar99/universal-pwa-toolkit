// src/core/sw-runtime/offline-fallback.js
//
// If a navigation request fails (no cache hit, no network), serve the
// configured offline fallback page instead of letting the browser show its
// own "no internet" error page. Only applies to navigation requests
// (request.mode === 'navigate') - we do not fall back for images/scripts/etc,
// since a silently-substituted broken image is worse than a normal failure.

export async function withOfflineFallback(request, cacheName, offlinePage, networkOrCacheAttempt) {
  try {
    return await networkOrCacheAttempt();
  } catch (err) {
    if (request.mode === 'navigate' && offlinePage) {
      const cache = await caches.open(cacheName);
      const fallback = await cache.match(offlinePage);
      if (fallback) return fallback;
    }
    throw err;
  }
}
