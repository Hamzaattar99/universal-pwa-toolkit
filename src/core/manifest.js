// src/core/manifest.js
//
// Builds a Web App Manifest object from config and makes it available to the
// browser. Two modes are supported:
//
//  1. Host already has a static manifest.json linked in <head> - in this case
//     we do nothing (respecting existing host setup) and just log a notice
//     via diagnostics.
//  2. No manifest link exists - we build one from config and inject it as a
//     <link rel="manifest"> pointing at a Blob URL.
//
// Known limitation (documented in Phase 1 and repeated here): a small number
// of install heuristics on some platforms are stricter about manifests being
// served as a real static file rather than a blob: URL. For production use,
// generating a static manifest.json at build time is recommended; the blob
// approach here is provided so the core module works with zero build step.

export function buildManifestObject(config) {
  return {
    name: config.name,
    short_name: config.shortName,
    start_url: config.startUrl,
    scope: config.scope,
    display: config.display,
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    icons: config.icons,
  };
}

export function injectManifest(config, { document: doc = document } = {}) {
  const existing = doc.querySelector('link[rel="manifest"]');
  if (existing) {
    return { injected: false, href: existing.getAttribute('href'), reason: 'existing-link-found' };
  }

  const manifestObject = buildManifestObject(config);
  const blob = new Blob([JSON.stringify(manifestObject)], { type: 'application/manifest+json' });
  const url = URL.createObjectURL(blob);

  const link = doc.createElement('link');
  link.rel = 'manifest';
  link.href = url;
  doc.head.appendChild(link);

  return { injected: true, href: url, manifest: manifestObject };
}
