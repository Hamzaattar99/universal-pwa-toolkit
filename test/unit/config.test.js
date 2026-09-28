import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../../src/config/defaults.js';

test('throws if name is missing', () => {
  assert.throws(() => mergeConfig({ startUrl: '/' }), /config.name is required/);
});

test('throws if startUrl is missing', () => {
  assert.throws(() => mergeConfig({ name: 'App' }), /config.startUrl is required/);
});

test('applies defaults for optional fields', () => {
  const config = mergeConfig({ name: 'App', startUrl: '/' });
  assert.equal(config.display, 'standalone');
  assert.equal(config.cache.strategy, 'network-first');
  assert.equal(config.modules.push.enabled, false);
});

test('shortName falls back to name, scope falls back to startUrl', () => {
  const config = mergeConfig({ name: 'My App', startUrl: '/app/' });
  assert.equal(config.shortName, 'My App');
  assert.equal(config.scope, '/app/');
});

test('explicit shortName and scope are respected', () => {
  const config = mergeConfig({ name: 'My App', shortName: 'MA', startUrl: '/app/', scope: '/' });
  assert.equal(config.shortName, 'MA');
  assert.equal(config.scope, '/');
});

test('nested cache config merges rather than replacing the whole object', () => {
  const config = mergeConfig({
    name: 'App',
    startUrl: '/',
    cache: { strategy: 'cache-first' },
  });
  // strategy overridden, but cacheName/maxEntries still come from defaults
  assert.equal(config.cache.strategy, 'cache-first');
  assert.equal(config.cache.cacheName, 'pwa-toolkit-v1');
  assert.equal(config.cache.maxEntries, 100);
});

test('icons array is replaced, not merged, when provided', () => {
  const icons = [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }];
  const config = mergeConfig({ name: 'App', startUrl: '/', icons });
  assert.deepEqual(config.icons, icons);
});
