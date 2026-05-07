import React from 'react';
import { createRoot } from 'react-dom/client';
import { BetterOpenApiViewer } from '../dist/index.js';

const target = document.querySelector('[data-better-openapi-viewer-root]');
const config = window.__BETTER_OPENAPI_VIEWER_CONFIG__ ?? {};

async function boot() {
  if (!target) {
    throw new Error('Better OpenAPI Viewer root element was not found.');
  }

  const hostSpecs = buildHostSpecs(config);
  const initialSpecId = resolveInitialSpecId(config, hostSpecs);
  let initialDocument;

  if (initialSpecId) {
    const activeHostSpec = hostSpecs.find((spec) => spec.id === initialSpecId);
    if (activeHostSpec) {
      try {
        const response = await fetch(activeHostSpec.jsonPath);
        if (response.ok) {
          initialDocument = await response.json();
        }
      } catch {
        // fall through; the React app will show a load error.
      }
    }
  }

  createRoot(target).render(
    React.createElement(BetterOpenApiViewer, {
      document: initialDocument,
      config,
      persistAuthorization: config.persistAuthorization,
      preauthorizedCredentials: config.preauthorizedCredentials,
      hostSpecs,
      initialSpecId,
    }),
  );
}

function buildHostSpecs(config) {
  if (Array.isArray(config.specs) && config.specs.length > 0) {
    return config.specs
      .filter((spec) => spec && spec.jsonPath)
      .map((spec, index) => ({
        id: spec.id ?? spec.path ?? `host-${index}`,
        name: spec.name ?? `Spec ${index + 1}`,
        jsonPath: spec.jsonPath,
        format: spec.format,
      }));
  }
  if (config.jsonPath) {
    return [{ id: 'host-0', name: 'OpenAPI', jsonPath: config.jsonPath }];
  }
  return [];
}

function resolveInitialSpecId(config, hostSpecs) {
  if (config.activeSpecId && hostSpecs.some((spec) => spec.id === config.activeSpecId)) {
    return config.activeSpecId;
  }
  return hostSpecs[0]?.id;
}

boot().catch((error) => {
  if (!target) {
    return;
  }

  target.innerHTML = `<main class="bov"><section class="bov-loading"><p class="bov-kicker" role="alert">Unable to load API documentation</p><h1>Request failed</h1><p class="bov-muted">${escapeHtml(error instanceof Error ? error.message : 'Unable to load OpenAPI document.')}</p></section></main>`;
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
