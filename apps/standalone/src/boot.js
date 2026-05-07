import React from 'react';
import { createRoot } from 'react-dom/client';
import { BetterOpenApiViewer } from '@clementoh/better-openapi-viewer-ui';

const target = document.querySelector('[data-better-openapi-viewer-root]');
const config = window.__BETTER_OPENAPI_VIEWER_CONFIG__ ?? {};

if (config.autoAddSpec && config.autoAddSpec.url) {
  try {
    const raw = window.localStorage.getItem('better-openapi-viewer:user-specs');
    const existing = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const match = list.find((spec) => spec && spec.url === config.autoAddSpec.url);
    if (match) {
      window.localStorage.setItem('better-openapi-viewer:last-spec', match.id);
    } else {
      const created = {
        id: `user-${Math.random().toString(36).slice(2, 10)}`,
        name: config.autoAddSpec.name || guessName(config.autoAddSpec.url),
        url: config.autoAddSpec.url,
        format: config.autoAddSpec.format || 'auto',
        addedAt: new Date().toISOString(),
      };
      list.push(created);
      window.localStorage.setItem('better-openapi-viewer:user-specs', JSON.stringify(list));
      window.localStorage.setItem('better-openapi-viewer:last-spec', created.id);
    }
  } catch {
    // ignore
  }
}

function guessName(url) {
  try {
    return new URL(url, window.location.href).hostname || 'API';
  } catch {
    return 'API';
  }
}

if (target) {
  createRoot(target).render(
    React.createElement(BetterOpenApiViewer, {
      config,
      persistAuthorization: config.persistAuthorization,
      hostSpecs: [],
    }),
  );
}
