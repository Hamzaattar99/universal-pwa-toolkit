// src/core/register-sw.js
//
// Registers the service worker at config.swPath / config.scope, and manages
// the "update available" lifecycle: a new SW version sits in `waiting` state
// until something calls skipWaiting - we never force-activate behind the
// host's back, since that can yank resources out from under an open tab.

export class UpdateManager {
  constructor({ registration, diagnostics } = {}) {
    this.registration = registration;
    this.diagnostics = diagnostics;
    this.listeners = new Set();
    this._waitingWorker = registration?.waiting || null;

    if (registration) {
      if (this._waitingWorker) this._emitUpdateAvailable();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this._waitingWorker = newWorker;
            this._emitUpdateAvailable();
          }
        });
      });
    }

    // When the new SW takes control, the page is running stale JS relative
    // to it in some cases - the common, safe pattern is a single reload.
    this._reloaded = false;
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (this._reloaded) return;
      this._reloaded = true;
      window.location.reload();
    });
  }

  hasUpdate() {
    return Boolean(this._waitingWorker);
  }

  /** Tell the waiting worker to activate. Triggers a reload via controllerchange. */
  applyUpdate() {
    if (!this._waitingWorker) {
      this.diagnostics?.warn('applyUpdate() called with no waiting worker.');
      return false;
    }
    this._waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  onUpdateAvailable(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emitUpdateAvailable() {
    this.diagnostics?.info('Update available.');
    for (const listener of this.listeners) listener();
  }
}

export class InstallManager {
  constructor({ diagnostics } = {}) {
    this.diagnostics = diagnostics;
    this._deferredPrompt = null;
    this.listeners = new Set();

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this._deferredPrompt = event;
      this.diagnostics?.info('App is installable.');
      for (const listener of this.listeners) listener(true);
    });

    window.addEventListener('appinstalled', () => {
      this._deferredPrompt = null;
      this.diagnostics?.info('App installed.');
      for (const listener of this.listeners) listener(false);
    });
  }

  canInstall() {
    return Boolean(this._deferredPrompt);
  }

  /** Shows the native install prompt. Must be called from a user gesture handler. */
  async promptInstall() {
    if (!this._deferredPrompt) {
      this.diagnostics?.warn('promptInstall() called with no deferred prompt available.');
      return { outcome: 'unavailable' };
    }
    const promptEvent = this._deferredPrompt;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    this._deferredPrompt = null;
    return choice; // { outcome: 'accepted' | 'dismissed', platform }
  }

  onInstallabilityChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export async function registerServiceWorker(config, { diagnostics } = {}) {
  if (!('serviceWorker' in navigator)) {
    diagnostics?.warn('Service workers are not supported in this browser. Core will run without offline/caching support.');
    return { supported: false };
  }

  try {
    const registration = await navigator.serviceWorker.register(config.swPath, {
      scope: config.scope,
    });
    diagnostics?.info(`Service worker registered with scope ${registration.scope}`);
    return { supported: true, registration };
  } catch (error) {
    diagnostics?.error('Service worker registration failed.', error);
    return { supported: true, registration: null, error };
  }
}
