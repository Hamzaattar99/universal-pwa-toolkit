// demo/sw.js
//
// This is the ~10 lines of code a host app needs to write by hand. Everything
// else is `importScripts` from the prebuilt toolkit file.

importScripts('./pwa-toolkit-sw.js');

const CONFIG = {
  cache: {
    strategy: 'network-first',
    cacheName: 'pwa-toolkit-demo-v1',
    precache: ['/', '/style.css', '/app.js', '/offline.html'],
    excludePatterns: ['/api/*'],
    maxEntries: 100,
  },
  offlinePage: '/offline.html',
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.PWAToolkitSW.handleInstall(CONFIG));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.PWAToolkitSW.handleActivate(CONFIG));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(self.PWAToolkitSW.handleFetch(event.request, CONFIG));
});

self.addEventListener('message', (event) => {
  self.PWAToolkitSW.handleMessage(event);
});
