import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@better-openapi-viewer/core';

export type BetterOpenApiViewerOptions = {
  path?: string;
  jsonPath?: string;
  document?: OpenAPIObject;
  documentFactory?: () => OpenAPIObject | Promise<OpenAPIObject>;
  cacheDocument?: boolean;
  title?: string;
  customCss?: string;
  customCssUrl?: string | string[];
  customJs?: string;
  customJsUrl?: string | string[];
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
  let cachedDocument = options.document;

  if (!cachedDocument && !options.documentFactory) {
    throw new Error('setupBetterOpenApiViewer requires an OpenAPI document or documentFactory.');
  }

  const getDocument = async () => {
    if (cachedDocument) {
      return cachedDocument;
    }

    const document = await options.documentFactory?.();

    if (!document) {
      throw new Error('setupBetterOpenApiViewer documentFactory did not return an OpenAPI document.');
    }

    if (options.cacheDocument ?? true) {
      cachedDocument = document;
    }

    return document;
  };

  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();

  instance.get(`/${jsonPath}`, async (_request: unknown, response: JsonResponse) => {
    sendJson(response, await getDocument());
  });

  instance.get(`/${uiPath}`, async (_request: unknown, response: HtmlResponse) => {
    const document = await getDocument();
    sendHtml(
      response,
      renderViewerHtml({
        jsonPath: `/${jsonPath}`,
        title: options.title ?? document.info?.title ?? 'Better OpenAPI Viewer',
        customCss: options.customCss,
        customCssUrl: options.customCssUrl,
        customJs: options.customJs,
        customJsUrl: options.customJsUrl,
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

type JsonResponse = {
  json?: (value: OpenAPIObject) => void;
  send?: (value: OpenAPIObject) => void;
};

type HtmlResponse = {
  type?: (value: string) => HtmlResponse;
  header?: (name: string, value: string) => HtmlResponse;
  send: (value: string) => void;
};

function normalizeRoute(route: string) {
  return route.replace(/^\/+|\/+$/g, '');
}

function renderViewerHtml({
  jsonPath,
  title,
  customCss,
  customCssUrl,
  customJs,
  customJsUrl,
  faviconUrl,
  config,
}: {
  jsonPath: string;
  title: string;
  customCss?: string;
  customCssUrl?: string | string[];
  customJs?: string;
  customJsUrl?: string | string[];
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
  const cssLinks = asArray(customCssUrl)
    .map((url) => `<link rel="stylesheet" href="${escapeAttribute(url)}" />`)
    .join('\n    ');
  const jsLinks = asArray(customJsUrl)
    .map((url) => `<script src="${escapeAttribute(url)}"></script>`)
    .join('\n    ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle}</title>
    ${faviconUrl ? `<link rel="icon" href="${escapeAttribute(faviconUrl)}" />` : ''}
    ${cssLinks}
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
      <p id="status" class="muted" role="status">Loading OpenAPI document...</p>
      <ul id="endpoints"></ul>
    </main>
    <script>
      window.__BETTER_OPENAPI_VIEWER_CONFIG__ = ${serializedConfig};
      const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
      const state = { endpoints: [] };
      const list = document.querySelector('#endpoints');
      const search = document.querySelector('#search');
      const count = document.querySelector('#count');
      const status = document.querySelector('#status');

      function render() {
        const query = search.value.trim().toLowerCase();
        const matches = state.endpoints.filter((endpoint) =>
          endpoint.searchText.includes(query)
        );
        count.textContent = matches.length + ' endpoint' + (matches.length === 1 ? '' : 's');
        list.innerHTML = groupByTag(matches).map(([tag, endpoints]) =>
          '<li><h2>' + escapeHtml(tag) + '</h2><ul>' + endpoints.map((endpoint) =>
            '<li><strong>' + escapeHtml(endpoint.method) + '</strong><span>' + escapeHtml(endpoint.path) + '</span>' +
            (endpoint.summary ? '<p class="muted">' + escapeHtml(endpoint.summary) + '</p>' : '') +
            (endpoint.deprecated ? '<p>Deprecated</p>' : '') +
            '</li>'
          ).join('') + '</ul></li>'
        ).join('');
      }

      fetch(window.__BETTER_OPENAPI_VIEWER_CONFIG__.jsonPath)
        .then((response) => {
          if (!response.ok) throw new Error('OpenAPI document request failed with HTTP ' + response.status);
          return response.json();
        })
        .then((openapi) => {
          window.openapiDocument = openapi;
          openapi.info && (window.document.querySelector('#title').textContent = openapi.info.title || 'OpenAPI');
          openapi.info && (window.document.querySelector('#description').textContent = openapi.info.description || '');
          state.endpoints = getOperationsFromDocument(openapi);
          status.textContent = '';
          render();
        })
        .catch((error) => {
          status.textContent = error instanceof Error ? error.message : 'Unable to load OpenAPI document.';
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
              deprecated: Boolean(operation.deprecated),
              tags: operation.tags && operation.tags.length ? operation.tags : ['default'],
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

      function groupByTag(endpoints) {
        const groups = new Map();
        endpoints.forEach((endpoint) => {
          endpoint.tags.forEach((tag) => groups.set(tag, [...(groups.get(tag) || []), endpoint]));
        });
        return Array.from(groups.entries());
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }
    </script>
    ${customJs ? `<script>${customJs.replace(/<\/script/gi, '<\\/script')}</script>` : ''}
    ${jsLinks}
  </body>
</html>`;
}

function sendJson(response: JsonResponse, value: OpenAPIObject) {
  if (response.json) {
    response.json(value);
    return;
  }

  response.send?.(value);
}

function sendHtml(response: HtmlResponse, value: string) {
  response.type?.('text/html');
  response.header?.('content-type', 'text/html');
  response.send(value);
}

function asArray<T>(value: T | T[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
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
