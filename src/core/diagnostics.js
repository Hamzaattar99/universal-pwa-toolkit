// src/core/diagnostics.js
//
// Centralized feature detection. Every module checks capabilities here
// instead of sniffing the user agent, and reports its status so the host
// app (and our own error handling) can react instead of guessing.

export function detectFeatures() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    caches: 'caches' in window,
    indexedDB: 'indexedDB' in window,
    pushManager: 'PushManager' in window && 'serviceWorker' in navigator,
    backgroundSync:
      'serviceWorker' in navigator &&
      'SyncManager' in window,
    beforeInstallPrompt: 'onbeforeinstallprompt' in window,
    online: typeof navigator.onLine === 'boolean',
  };
}

/**
 * Small event-driven logger. Keeps a bounded in-memory log of toolkit events
 * and errors so a host app can display a diagnostics panel if it wants one,
 * without the toolkit forcing any particular UI on them.
 */
export class Diagnostics {
  constructor({ maxEntries = 50 } = {}) {
    this.maxEntries = maxEntries;
    this.entries = [];
    this.listeners = new Set();
  }

  log(level, message, detail) {
    const entry = { level, message, detail, timestamp: Date.now() };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.shift();
    for (const listener of this.listeners) listener(entry);
    if (level === 'error') {
      // Never swallow errors silently - always surface to the console too.
      console.error(`[pwa-toolkit] ${message}`, detail ?? '');
    }
    return entry;
  }

  info(message, detail) {
    return this.log('info', message, detail);
  }

  warn(message, detail) {
    return this.log('warn', message, detail);
  }

  error(message, detail) {
    return this.log('error', message, detail);
  }

  onEntry(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getEntries() {
    return [...this.entries];
  }
}
