# Universal PWA Toolkit — Phase 2: Core Implementation

This phase implements the **core module only** (no backend, no push/sync/IndexedDB yet — those are Phase 3). It works with a plain HTML/CSS/JS app and zero build step.

## What's implemented

- `createPWA(config)` — single entry point (`src/index.js`)
- Manifest generation + injection (`src/core/manifest.js`)
- Service worker registration (`src/core/register-sw.js`)
- Three configurable cache strategies: `network-first`, `cache-first`, `stale-while-revalidate` (`src/core/sw-runtime/cache-strategies.js`, mirrored as a classic script in `dist/pwa-toolkit-sw.js`)
- Offline navigation fallback (`src/core/sw-runtime/offline-fallback.js`)
- Update detection + `applyUpdate()` (`src/core/register-sw.js` → `UpdateManager`)
- Install prompt capture + `promptInstall()` (`src/core/register-sw.js` → `InstallManager`)
- Online/offline status (`src/core/network-status.js`)
- Feature detection + event log (`src/core/diagnostics.js`)

## Directory structure (this phase)

```
pwa-toolkit/
├── package.json
├── README.md
├── src/
│   ├── index.js
│   ├── config/defaults.js
│   └── core/
│       ├── manifest.js
│       ├── register-sw.js
│       ├── network-status.js
│       ├── diagnostics.js
│       └── sw-runtime/
│           ├── cache-strategies.js
│           └── offline-fallback.js
├── dist/
│   └── pwa-toolkit-sw.js       # prebuilt, classic-script mirror of sw-runtime/*
├── demo/                        # working vanilla HTML/CSS/JS app
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── sw.js
│   ├── pwa-toolkit-sw.js        # copy of dist/, this is what a host would copy in
│   ├── offline.html
│   └── icon-192.png / icon-512.png
└── test/
    ├── unit/                    # Node built-in test runner, pure logic
    │   ├── config.test.js
    │   └── cache-strategies.test.js
    └── browser/                 # requires a real browser
        ├── index.html
        ├── sw.js
        └── offline-stub.html
```

## How to run the demo

No build step needed. Service workers require a secure context, so `file://` won't work — serve over `localhost` or HTTPS:

```bash
cd demo
npx http-server . -c-1
# or: python3 -m http.server 8080
```

Open the printed `http://localhost:...` URL. You should see four live status cards (network, installability, update, service worker) and a diagnostics log.

## How to run the tests

**Unit tests** (pure logic — config merging, cache-header rules, exclude-pattern matching — no browser needed):

```bash
npm test
# or directly: node --test test/unit/*.test.js
```

**Browser tests** (Service Worker, Cache Storage, manifest injection — these APIs don't exist in Node, so they must run in an actual browser):

```bash
cd test/browser
npx http-server . -c-1
```

Open the printed URL. Most checks run automatically and show PASS/FAIL; a few are marked MANUAL because they depend on a real user gesture (install prompt) or real connectivity loss (offline fallback) that can't be triggered from a script.

## Test results

**Unit tests:** 15/15 passing (run in this environment — see log below).

```
# tests 15
# pass 15
# fail 0
```

Covers: missing required fields raise clear errors, defaults apply correctly, nested config (e.g. `cache.strategy`) merges instead of replacing the whole object, arrays (`icons`) replace rather than merge, `Cache-Control: no-store`/`private` responses are correctly excluded from caching, non-GET requests are never cached, and the exclude-pattern wildcard matcher behaves correctly.

**Browser tests:** written but **not executed in this sandbox** — this environment has no browser runtime and no network egress to fetch one. The harness at `test/browser/index.html` is designed to be run by you in an actual browser (any modern Chromium/Firefox/Safari). Please run it and report back; I'll treat anything you can't get passing as a Phase 2 bug to fix before Phase 3.

Distinguishing tested vs. implemented-only, honestly:
- **Tested (by me, in this sandbox):** config merging/validation, cache-header eligibility rules, exclude-pattern matching.
- **Implemented but only self-reviewed, not executed:** manifest injection, service worker registration/lifecycle, all three cache strategies against real `fetch`/`caches`, offline fallback, update flow, install prompt capture, network status events. These all require real browser APIs (`ServiceWorkerContainer`, `CacheStorage`, `beforeinstallprompt`) that don't exist in Node — I wrote the browser test harness specifically so you (or I, if given browser access) can verify them for real rather than taking the implementation on faith.

## Known limitations

- Dynamic manifest injection uses a `blob:` URL when no static manifest is already linked. This works in current Chromium and Firefox, but some platforms' install heuristics are stricter about a real static file — for production, generate `manifest.json` at build time instead (planned refinement in Phase 5's packaging step).
- `dist/pwa-toolkit-sw.js` is currently **hand-written** to mirror `src/core/sw-runtime/*.js`, not generated by a build step. This is intentional for Phase 2 (no bundler required yet), but means the two must be kept in sync by hand until Phase 5 introduces an actual build script. I've kept the logic identical; a future automated build removes this risk entirely.
- Background Sync, Push, and IndexedDB modules are **not implemented** — enabling them in config currently just logs a warning and does nothing, by design, so a host isn't silently misled into thinking they're active.
- `navigator.onLine` reflects the network adapter, not real internet reachability — documented in `network-status.js` rather than papered over.
- Cache trimming (`maxEntries`) deletes oldest-inserted entries; it does not track true last-access time (would need a metadata store), which is a reasonable simplification but worth knowing.
- No bundler/minifier is used yet — `dist/pwa-toolkit-sw.js` is readable, unminified source. Minification is a Phase 5 packaging concern.

## Security considerations addressed this phase

- Cache strategies refuse to store non-GET requests and responses marked `no-store`/`private` (see `isCacheable`).
- `excludePatterns` lets a host guarantee certain paths (e.g. `/api/auth/*`) are never touched by the cache layer, regardless of strategy.
- The service worker never activates a new version behind the page's back — it waits in `waiting` state until `applyUpdate()` is called, so an open tab is never silently switched to new code mid-session.
- No secrets of any kind pass through this phase — there's nothing backend-related here yet (that's Phase 4).

Still outstanding for later phases: logout/shared-device cache clearing hook, queued-request validation (Phase 3), CSRF/auth on subscription endpoints (Phase 4).

## What's next (Phase 3)

IndexedDB helpers, Push subscription management (client-side), and the Background Sync request queue — each independently configurable, with documented fallbacks for unsupported browsers.

---
Waiting for your approval (and, ideally, your own run of the browser test harness) before starting Phase 3.
