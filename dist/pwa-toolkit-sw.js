/*
 * pwa-toolkit-sw.js
 *
 * Prebuilt, dependency-free service worker runtime. This is the "direct
 * integration" distribution: a classic (non-module) script a host can copy
 * into their project and `importScripts()` from their own sw.js, with zero
 * build step. It mirrors src/core/sw-runtime/*.js - if you're using npm and
 * a bundler, import from src/ instead and treat this file as generated.
 *
 * Usage in your sw.js:
 *
 *   importScripts('./pwa-toolkit-sw.js');
 *   const CONFIG = { cache: { strategy: 'network-first', cacheName: 'my-app-v1',
 *                              precache: ['/', '/style.css'], excludePatterns: ['/api/auth/*'],
 *                              maxEntries: 100 },
 *                     offlinePage: '/offline.html' };
 *   self.addEventListener('install', (e) => e.waitUntil(PWAToolkitSW.handleInstall(CONFIG)));
 *   self.addEventListener('activate', (e) => e.waitUntil(PWAToolkitSW.handleActivate(CONFIG)));
 *   self.addEventListener('fetch', (e) => e.respondWith(PWAToolkitSW.handleFetch(e.request, CONFIG)));
 *   self.addEventListener('message', (e) => PWAToolkitSW.handleMessage(e));
 */
(function () {
  'use strict';

  function isCacheable(request, response) {
    if (request.method !== 'GET') return false;
    if (!response || !response.ok) return false;
    var cacheControl = response.headers.get('Cache-Control') || '';
    if (/no-store/i.test(cacheControl) || /private/i.test(cacheControl)) return false;
    return true;
  }

  function matchesExcludePattern(url, excludePatterns) {
    excludePatterns = excludePatterns || [];
    for (var i = 0; i < excludePatterns.length; i++) {
      var pattern = excludePatterns[i];
      if (pattern.slice(-1) === '*') {
        if (url.indexOf(pattern.slice(0, -1)) === 0) return true;
      } else if (url === pattern) {
        return true;
      }
    }
    return false;
  }

  function trimCache(cacheName, maxEntries) {
    return caches.open(cacheName).then(function (cache) {
      return cache.keys().then(function (keys) {
        if (keys.length <= maxEntries) return;
        var excess = keys.length - maxEntries;
        var deletions = [];
        for (var i = 0; i < excess; i++) deletions.push(cache.delete(keys[i]));
        return Promise.all(deletions);
      });
    });
  }

  function cacheFirst(request, opts) {
    return caches.open(opts.cacheName).then(function (cache) {
      return cache.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          if (isCacheable(request, response)) {
            cache.put(request, response.clone());
            trimCache(opts.cacheName, opts.maxEntries);
          }
          return response;
        });
      });
    });
  }

  function networkFirst(request, opts) {
    var timeoutMs = opts.timeoutMs || 4000;
    return caches.open(opts.cacheName).then(function (cache) {
      return Promise.race([
        fetch(request),
        new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('network-timeout')); }, timeoutMs);
        }),
      ]).then(function (response) {
        if (isCacheable(request, response)) {
          cache.put(request, response.clone());
          trimCache(opts.cacheName, opts.maxEntries);
        }
        return response;
      }).catch(function (err) {
        return cache.match(request).then(function (cached) {
          if (cached) return cached;
          throw err;
        });
      });
    });
  }

  function staleWhileRevalidate(request, opts) {
    return caches.open(opts.cacheName).then(function (cache) {
      return cache.match(request).then(function (cached) {
        var networkFetch = fetch(request).then(function (response) {
          if (isCacheable(request, response)) {
            cache.put(request, response.clone());
            trimCache(opts.cacheName, opts.maxEntries);
          }
          return response;
        }).catch(function () { return null; });
        return cached || networkFetch;
      });
    });
  }

  function getStrategy(name) {
    if (name === 'cache-first') return cacheFirst;
    if (name === 'stale-while-revalidate') return staleWhileRevalidate;
    return networkFirst;
  }

  function handleInstall(config) {
    var cacheCfg = config.cache || {};
    var precache = cacheCfg.precache || [];
    self.skipWaiting_pending = true; // we wait for an explicit message, see handleMessage
    if (precache.length === 0) return Promise.resolve();
    return caches.open(cacheCfg.cacheName).then(function (cache) {
      return cache.addAll(precache);
    });
  }

  function handleActivate(config) {
    // Clean up old versioned caches that don't match the current cacheName.
    var currentCache = (config.cache || {}).cacheName;
    return caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key.indexOf('pwa-toolkit-') === 0 && key !== currentCache; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    });
  }

  function handleFetch(request, config) {
    var cacheCfg = config.cache || {};
    var url = new URL(request.url).pathname;

    if (request.method !== 'GET' || matchesExcludePattern(url, cacheCfg.excludePatterns)) {
      return fetch(request);
    }

    var strategy = getStrategy(cacheCfg.strategy);
    var attempt = function () { return strategy(request, cacheCfg); };

    return attempt().catch(function (err) {
      if (request.mode === 'navigate' && config.offlinePage) {
        return caches.open(cacheCfg.cacheName).then(function (cache) {
          return cache.match(config.offlinePage).then(function (fallback) {
            if (fallback) return fallback;
            throw err;
          });
        });
      }
      throw err;
    });
  }

  function handleMessage(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  }

  self.PWAToolkitSW = {
    handleInstall: handleInstall,
    handleActivate: handleActivate,
    handleFetch: handleFetch,
    handleMessage: handleMessage,
    // exposed for unit-style testing inside a real browser/SW context
    _internal: {
      isCacheable: isCacheable,
      matchesExcludePattern: matchesExcludePattern,
      getStrategy: getStrategy,
    },
  };
})();
