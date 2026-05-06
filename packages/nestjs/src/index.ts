import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@better-openapi-viewer/core';

export type BetterOpenApiViewerOptions = {
  path?: string;
  jsonPath?: string;
  document?: OpenAPIObject;
  documentFactory?: () => OpenAPIObject;
  title?: string;
  customCss?: string;
  faviconUrl?: string;
  defaultExpansion?: 'none' | 'list' | 'full';
  deepLinking?: boolean;
  filter?: boolean | string;
  displayRequestDuration?: boolean;
  supportedSubmitMethods?: string[];
  persistAuthorization?: boolean;
};

export function setupBetterOpenApiViewer(app: INestApplication, options: BetterOpenApiViewerOptions = {}) {
  const uiPath = normalizeRoute(options.path ?? 'docs');
  const jsonPath = normalizeRoute(options.jsonPath ?? `${uiPath}/openapi.json`);
  const document = options.document ?? options.documentFactory?.();

  if (!document) {
    throw new Error('setupBetterOpenApiViewer requires an OpenAPI document or documentFactory.');
  }

  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();

  instance.get(`/${jsonPath}`, (_request: unknown, response: { json: (value: OpenAPIObject) => void }) => {
    response.json(document);
  });

  instance.get(`/${uiPath}`, (_request: unknown, response: { type: (value: string) => void; send: (value: string) => void }) => {
    response.type('text/html');
    response.send(
      renderViewerHtml({
        jsonPath: `/${jsonPath}`,
        title: options.title ?? document.info?.title ?? 'Better OpenAPI Viewer',
        customCss: options.customCss,
        faviconUrl: options.faviconUrl,
        config: {
          defaultExpansion: options.defaultExpansion ?? 'list',
          deepLinking: options.deepLinking ?? true,
          filter: options.filter ?? true,
          displayRequestDuration: options.displayRequestDuration ?? true,
          supportedSubmitMethods: options.supportedSubmitMethods ?? ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'],
          persistAuthorization: options.persistAuthorization ?? false,
        },
      }),
    );
  });
}

function normalizeRoute(route: string) {
  return route.replace(/^\/+|\/+$/g, '');
}

function renderViewerHtml({
  jsonPath,
  title,
  customCss,
  faviconUrl,
  config,
}: {
  jsonPath: string;
  title: string;
  customCss?: string;
  faviconUrl?: string;
  config: {
    defaultExpansion: 'none' | 'list' | 'full';
    deepLinking: boolean;
    filter: boolean | string;
    displayRequestDuration: boolean;
    supportedSubmitMethods: string[];
    persistAuthorization: boolean;
  };
}) {
  const serializedConfig = JSON.stringify({ jsonPath, ...config }).replace(/</g, '\\u003c');
  const escapedTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle}</title>
    ${faviconUrl ? `<link rel="icon" href="${escapeAttribute(faviconUrl)}" />` : ''}
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; background: #f7f8fb; color: #151923; }
      main { max-width: 1120px; margin: 0 auto; padding: 48px 24px; }
      h1 { font-size: 40px; margin: 0 0 8px; }
      input { box-sizing: border-box; width: 100%; padding: 14px 16px; border: 1px solid #ccd2df; border-radius: 8px; font: inherit; }
      ul { list-style: none; padding: 0; display: grid; gap: 10px; }
      li { background: #fff; border: 1px solid #dfe4ee; border-radius: 8px; padding: 14px 16px; }
      strong { display: inline-block; min-width: 72px; color: #0b6bcb; }
      .muted { color: #596276; }
      ${customCss ?? ''}
    </style>
  </head>
  <body>
    <main>
      <p class="muted">OpenAPI document: <a href="${jsonPath}">${jsonPath}</a></p>
      <h1 id="title">Better OpenAPI Viewer</h1>
      <p id="description" class="muted"></p>
      <input id="search" type="search" placeholder="Search endpoints" autocomplete="off" />
      <p id="count" class="muted"></p>
      <ul id="endpoints"></ul>
    </main>
    <script>
      window.__BETTER_OPENAPI_VIEWER_CONFIG__ = ${serializedConfig};
      const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
      const state = { endpoints: [] };
      const list = document.querySelector('#endpoints');
      const search = document.querySelector('#search');
      const count = document.querySelector('#count');

      function render() {
        const query = search.value.trim().toLowerCase();
        const matches = state.endpoints.filter((endpoint) =>
          endpoint.path.toLowerCase().includes(query) || endpoint.method.toLowerCase().includes(query)
        );
        count.textContent = matches.length + ' endpoint' + (matches.length === 1 ? '' : 's');
        list.innerHTML = matches.map((endpoint) =>
          '<li><strong>' + endpoint.method + '</strong><span>' + endpoint.path + '</span></li>'
        ).join('');
      }

      fetch(window.__BETTER_OPENAPI_VIEWER_CONFIG__.jsonPath)
        .then((response) => response.json())
        .then((openapi) => {
          window.openapiDocument = openapi;
          openapi.info && (window.document.querySelector('#title').textContent = openapi.info.title || 'OpenAPI');
          openapi.info && (window.document.querySelector('#description').textContent = openapi.info.description || '');
          state.endpoints = getOperationsFromDocument(openapi);
          render();
        });

      search.addEventListener('input', render);

      function getOperationsFromDocument(openapi) {
        return Object.entries(openapi.paths || {}).flatMap(([path, pathItem]) =>
          httpMethods.flatMap((method) => {
            const operation = pathItem && pathItem[method];
            if (!operation) return [];

            return [{
              method: method.toUpperCase(),
              path,
              summary: operation.summary || '',
              searchText: [
                method,
                path,
                ...(operation.tags || []),
                operation.summary,
                operation.description,
                operation.operationId,
                ...Object.keys(operation.responses || {})
              ].filter(Boolean).join(' ').toLowerCase()
            }];
          })
        );
      }
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export type { OpenAPIObject };
