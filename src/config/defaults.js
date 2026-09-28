// src/config/defaults.js
//
// Defines the default configuration and a small deep-merge used to combine
// the host app's config with these defaults. Only `name` and `startUrl`
// are mandatory in the config the host provides.

export const DEFAULTS = {
  name: null, // mandatory - no default
  shortName: null, // falls back to `name` at merge time
  startUrl: null, // mandatory - no default
  scope: null, // falls back to `startUrl` at merge time
  display: 'standalone',
  themeColor: '#000000',
  backgroundColor: '#ffffff',
  icons: [], // [{ src, sizes, type }]
  offlinePage: null, // optional - if unset, offline fallback is disabled
  swPath: '/sw.js', // where the host has placed (or will place) the service worker
  cache: {
    strategy: 'network-first', // 'network-first' | 'cache-first' | 'stale-while-revalidate'
    cacheName: 'pwa-toolkit-v1',
    precache: [], // list of URLs to cache on install
    excludePatterns: [], // array of strings or RegExp-like strings; matched requests are never cached
    maxEntries: 100, // soft cap per cache to avoid unbounded growth
  },
  modules: {
    push: { enabled: false },
    backgroundSync: { enabled: false },
    indexedDB: { enabled: false },
  },
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Shallow-aware deep merge for plain config objects. Arrays are replaced,
 * not concatenated - a host that sets `icons: [...]` means exactly those icons.
 */
export function mergeConfig(userConfig = {}) {
  function merge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      if (isPlainObject(sourceVal) && isPlainObject(target[key])) {
        result[key] = merge(target[key], sourceVal);
      } else {
        result[key] = sourceVal;
      }
    }
    return result;
  }

  const merged = merge(DEFAULTS, userConfig);

  if (!merged.name) {
    throw new Error('[pwa-toolkit] config.name is required.');
  }
  if (!merged.startUrl) {
    throw new Error('[pwa-toolkit] config.startUrl is required.');
  }
  if (!merged.shortName) merged.shortName = merged.name;
  if (!merged.scope) merged.scope = merged.startUrl;

  return merged;
}
