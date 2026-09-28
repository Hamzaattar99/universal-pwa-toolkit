// src/index.js
//
// Public entry point. Wires together the core pieces. Optional modules
// (push, background sync, IndexedDB) are NOT implemented yet - that's
// Phase 3 - so `modules.*.enabled: true` currently just logs a notice
// rather than silently doing nothing, so hosts aren't confused.

import { mergeConfig } from './config/defaults.js';
import { injectManifest } from './core/manifest.js';
import { registerServiceWorker, UpdateManager, InstallManager } from './core/register-sw.js';
import { NetworkStatus } from './core/network-status.js';
import { Diagnostics, detectFeatures } from './core/diagnostics.js';

export function createPWA(userConfig) {
  const config = mergeConfig(userConfig);
  const diagnostics = new Diagnostics();
  const features = detectFeatures();

  let updateManager = null;
  let installManager = null;
  let networkStatus = null;
  let initialized = false;

  async function init() {
    if (initialized) {
      diagnostics.warn('init() called more than once - ignoring.');
      return api;
    }
    initialized = true;

    injectManifest(config);

    for (const [name, moduleConfig] of Object.entries(config.modules)) {
      if (moduleConfig?.enabled) {
        diagnostics.warn(
          `Module "${name}" is enabled in config but not yet implemented (arrives in Phase 3). Ignoring for now.`
        );
      }
    }

    const { supported, registration } = await registerServiceWorker(config, { diagnostics });
    if (supported && registration) {
      updateManager = new UpdateManager({ registration, diagnostics });
    }

    installManager = new InstallManager({ diagnostics });
    networkStatus = new NetworkStatus({ diagnostics });

    diagnostics.info('PWA toolkit initialized.', { features });
    return api;
  }

  const api = {
    init,
    getConfig: () => ({ ...config }),
    getFeatures: () => ({ ...features }),
    getDiagnostics: () => diagnostics,

    // Update lifecycle
    hasUpdate: () => updateManager?.hasUpdate() ?? false,
    applyUpdate: () => updateManager?.applyUpdate() ?? false,
    onUpdateAvailable: (listener) => updateManager?.onUpdateAvailable(listener) ?? (() => {}),

    // Installability
    canInstall: () => installManager?.canInstall() ?? false,
    promptInstall: () => installManager?.promptInstall() ?? Promise.resolve({ outcome: 'unavailable' }),
    onInstallabilityChange: (listener) => installManager?.onInstallabilityChange(listener) ?? (() => {}),

    // Network status
    getNetworkStatus: () => networkStatus?.status ?? (navigator.onLine ? 'online' : 'offline'),
    onNetworkChange: (listener) => networkStatus?.onChange(listener) ?? (() => {}),
  };

  return api;
}
