import { createPWA } from '../src/index.js';

const logEl = document.getElementById('log-output');
const logLines = [];
function log(line) {
  logLines.push(`[${new Date().toLocaleTimeString()}] ${line}`);
  logEl.textContent = logLines.slice(-30).join('\n');
}

const pwa = createPWA({
  name: 'PWA Toolkit Demo',
  shortName: 'PWA Demo',
  startUrl: '/',
  scope: '/',
  display: 'standalone',
  themeColor: '#1b2430',
  backgroundColor: '#12181f',
  icons: [
    { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: './icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
  offlinePage: '/offline.html',
  swPath: './sw.js',
  cache: {
    strategy: 'network-first',
    cacheName: 'pwa-toolkit-demo-v1',
    precache: ['/', '/style.css', '/app.js', '/offline.html'],
    excludePatterns: ['/api/*'],
  },
});

// Mirror every diagnostics entry into the on-page log so this is testable
// without opening devtools.
pwa.getDiagnostics().onEntry((entry) => log(`${entry.level.toUpperCase()}: ${entry.message}`));

async function main() {
  await pwa.init();

  const features = pwa.getFeatures();
  document.getElementById('sw-value').textContent = features.serviceWorker
    ? 'Registered'
    : 'Not supported in this browser';

  // Network status
  const networkEl = document.getElementById('network-value');
  const renderNetwork = () => {
    networkEl.textContent = pwa.getNetworkStatus() === 'online' ? 'Online' : 'Offline';
  };
  renderNetwork();
  pwa.onNetworkChange(renderNetwork);

  // Installability
  const installBtn = document.getElementById('install-btn');
  const installValue = document.getElementById('install-value');
  const renderInstall = (canInstall) => {
    installValue.textContent = canInstall ? 'Ready to install' : 'Not available right now';
    installBtn.disabled = !canInstall;
  };
  renderInstall(pwa.canInstall());
  pwa.onInstallabilityChange(renderInstall);
  installBtn.addEventListener('click', async () => {
    const result = await pwa.promptInstall();
    log(`Install prompt result: ${result.outcome}`);
  });

  // Updates
  const updateBtn = document.getElementById('update-btn');
  const updateValue = document.getElementById('update-value');
  pwa.onUpdateAvailable(() => {
    updateValue.textContent = 'Update available';
    updateBtn.disabled = false;
  });
  updateBtn.addEventListener('click', () => {
    pwa.applyUpdate();
  });
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  console.error(err);
});
