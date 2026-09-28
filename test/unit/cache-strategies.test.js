import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCacheable, matchesExcludePattern } from '../../src/core/sw-runtime/cache-strategies.js';

function fakeRequest(method = 'GET') {
  return { method };
}

function fakeResponse({ ok = true, cacheControl = '' } = {}) {
  return {
    ok,
    headers: { get: (name) => (name === 'Cache-Control' ? cacheControl : null) },
  };
}

test('isCacheable rejects non-GET requests', () => {
  assert.equal(isCacheable(fakeRequest('POST'), fakeResponse()), false);
});

test('isCacheable rejects non-ok responses', () => {
  assert.equal(isCacheable(fakeRequest('GET'), fakeResponse({ ok: false })), false);
});

test('isCacheable rejects no-store responses', () => {
  assert.equal(
    isCacheable(fakeRequest('GET'), fakeResponse({ cacheControl: 'no-store' })),
    false
  );
});

test('isCacheable rejects private responses', () => {
  assert.equal(
    isCacheable(fakeRequest('GET'), fakeResponse({ cacheControl: 'private, max-age=0' })),
    false
  );
});

test('isCacheable accepts a plain ok GET response', () => {
  assert.equal(isCacheable(fakeRequest('GET'), fakeResponse()), true);
});

test('matchesExcludePattern supports exact match', () => {
  assert.equal(matchesExcludePattern('/api/auth/login', ['/api/auth/login']), true);
  assert.equal(matchesExcludePattern('/api/auth/other', ['/api/auth/login']), false);
});

test('matchesExcludePattern supports trailing wildcard', () => {
  assert.equal(matchesExcludePattern('/api/auth/login', ['/api/auth/*']), true);
  assert.equal(matchesExcludePattern('/api/public/list', ['/api/auth/*']), false);
});

test('matchesExcludePattern returns false when no patterns given', () => {
  assert.equal(matchesExcludePattern('/anything', []), false);
  assert.equal(matchesExcludePattern('/anything', undefined), false);
});
