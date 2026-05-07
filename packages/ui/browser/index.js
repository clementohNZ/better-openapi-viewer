import React from 'react';
import { createRoot } from 'react-dom/client';
import { BetterOpenApiViewer } from '../dist/index.js';

const target = document.querySelector('[data-better-openapi-viewer-root]');
const config = window.__BETTER_OPENAPI_VIEWER_CONFIG__ ?? {};

async function boot() {
  if (!target) {
    throw new Error('Better OpenAPI Viewer root element was not found.');
  }

  const response = await fetch(config.jsonPath);

  if (!response.ok) {
    throw new Error(`OpenAPI document request failed with HTTP ${response.status}`);
  }

  const document = await response.json();
  createRoot(target).render(
    React.createElement(BetterOpenApiViewer, {
      document,
      config,
      persistAuthorization: config.persistAuthorization,
      preauthorizedCredentials: config.preauthorizedCredentials,
    }),
  );
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
