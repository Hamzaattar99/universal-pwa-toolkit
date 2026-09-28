importScripts('../../dist/pwa-toolkit-sw.js');

const CONFIG = {
  cache: {
    strategy: 'network-first',
    cacheName: 'pwa-toolkit-browsertest-v1',
    precache: ['./index.html'],
    excludePatterns: ['/never-cache/*'],
    maxEntries: 100,
  },
  offlinePage: './offline-stub.html',
};

self.addEventListener('install', (e) => e.waitUntil(self.PWAToolkitSW.handleInstall(CONFIG)));
self.addEventListener('activate', (e) => e.waitUntil(self.PWAToolkitSW.handleActivate(CONFIG)));
self.addEventListener('fetch', (e) => e.respondWith(self.PWAToolkitSW.handleFetch(e.request, CONFIG)));
self.addEventListener('message', (e) => self.PWAToolkitSW.handleMessage(e));
