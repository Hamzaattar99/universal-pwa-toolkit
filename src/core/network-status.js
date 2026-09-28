// src/core/network-status.js
//
// Thin wrapper around navigator.onLine + online/offline events. Kept
// deliberately tiny: this is not a "real" connectivity check (navigator.onLine
// only reflects network-adapter state, not actual internet reachability),
// and we document that rather than pretend otherwise.

export class NetworkStatus {
  constructor({ diagnostics } = {}) {
    this.diagnostics = diagnostics;
    this.listeners = new Set();
    this._handleOnline = () => this._emit('online');
    this._handleOffline = () => this._emit('offline');
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);
  }

  get status() {
    return navigator.onLine ? 'online' : 'offline';
  }

  isOnline() {
    return navigator.onLine;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(status) {
    this.diagnostics?.info(`Network status changed: ${status}`);
    for (const listener of this.listeners) listener(status);
  }

  destroy() {
    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);
    this.listeners.clear();
  }
}
