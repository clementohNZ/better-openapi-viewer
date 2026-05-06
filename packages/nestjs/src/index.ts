import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@better-openapi-viewer/core';

export type BetterOpenApiViewerDocumentFactory = () => OpenAPIObject | Promise<OpenAPIObject>;

export type BetterOpenApiViewerSpec = {
  name: string;
  path?: string;
  jsonPath?: string;
  document?: OpenAPIObject;
  documentFactory?: BetterOpenApiViewerDocumentFactory;
  title?: string;
};

export type BetterOpenApiViewerStaticAssetsOptions = {
  path?: string;
  serve?: (context: { app: INestApplication; path: string }) => void;
};

export type BetterOpenApiViewerOptions = {
  path?: string;
  jsonPath?: string;
  document?: OpenAPIObject;
  documentFactory?: BetterOpenApiViewerDocumentFactory;
  cacheDocument?: boolean;
  specs?: BetterOpenApiViewerSpec[];
  title?: string;
  staticAssets?: BetterOpenApiViewerStaticAssetsOptions | false;
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
  const specs = createSpecEntries(options, uiPath);
  const staticAssets = options.staticAssets || undefined;
  const assetPath = normalizeRoute(staticAssets?.path ?? `${uiPath}/assets`);

  if (staticAssets) {
    staticAssets.serve?.({ app, path: `/${assetPath}` });
  }

  specs.forEach((spec) => {
    registerGet(app, `/${spec.jsonPath}`, async (_request, response) => {
      sendJson(response, await spec.getDocument());
    });
  });

  specs
    .filter((spec) => spec.uiPath !== uiPath)
    .forEach((spec) => {
      registerGet(app, `/${spec.uiPath}`, async (_request, response) => {
        sendHtml(response, renderViewerHtmlForSpec(spec, specs, options, assetPath, await spec.getDocument()));
      });
    });

  registerGet(app, `/${uiPath}`, async (_request, response) => {
    const spec = specs[0] as SpecEntry;
    sendHtml(response, renderViewerHtmlForSpec(spec, specs, options, assetPath, await spec.getDocument()));
  });
}

type SpecEntry = {
  name: string;
  uiPath: string;
  jsonPath: string;
  title?: string;
  getDocument: () => Promise<OpenAPIObject>;
};

type RouteResponse = JsonResponse & HtmlResponse;
type RouteHandler = (request: unknown, response: RouteResponse) => void | Promise<void>;

type HttpAdapter = {
  get?: (path: string, handler: RouteHandler) => void;
  getInstance?: () => {
    get?: (path: string, handler: RouteHandler) => void;
  };
};

type NestAppWithStaticAssets = INestApplication & {
  useStaticAssets?: (path: string, options?: Record<string, unknown>) => void;
};

type JsonResponse = {
  header?: (name: string, value: string) => JsonResponse;
  json?: (value: OpenAPIObject) => void;
  send?: (value: OpenAPIObject | string) => void;
};

type HtmlResponse = {
  type?: (value: string) => HtmlResponse;
  header?: (name: string, value: string) => HtmlResponse;
  send: (value: string) => void;
};

function createSpecEntries(options: BetterOpenApiViewerOptions, uiPath: string) {
  const specOptions =
    options.specs && options.specs.length > 0
      ? options.specs
      : [
          {
            name: options.title ?? 'OpenAPI',
            path: uiPath,
            jsonPath: options.jsonPath,
            document: options.document,
            documentFactory: options.documentFactory,
            title: options.title,
          },
        ];

  return specOptions.map<SpecEntry>((spec, index) => {
    let cachedDocument = spec.document;

    if (!cachedDocument && !spec.documentFactory) {
      throw new Error(`setupBetterOpenApiViewer requires an OpenAPI document or documentFactory for spec "${spec.name}".`);
    }

    const specUiPath = normalizeRoute(spec.path ?? (index === 0 ? uiPath : `${uiPath}/${slugify(spec.name)}`));
    const specJsonPath = normalizeRoute(spec.jsonPath ?? `${specUiPath}/openapi.json`);

    return {
      name: spec.name,
      uiPath: specUiPath,
      jsonPath: specJsonPath,
      title: spec.title,
      getDocument: async () => {
        if (cachedDocument) {
          return cachedDocument;
        }

        const document = await spec.documentFactory?.();

        if (!document) {
          throw new Error(`setupBetterOpenApiViewer documentFactory did not return an OpenAPI document for spec "${spec.name}".`);
        }

        if (options.cacheDocument ?? true) {
          cachedDocument = document;
        }

        return document;
      },
    };
  });
}

function registerGet(app: INestApplication, path: string, handler: RouteHandler) {
  const httpAdapter = app.getHttpAdapter() as HttpAdapter;
  const routeTarget = httpAdapter.get ? httpAdapter : httpAdapter.getInstance?.();

  if (!routeTarget?.get) {
    throw new Error('setupBetterOpenApiViewer could not register a GET route with the active NestJS HTTP adapter.');
  }

  routeTarget.get(path, handler);
}

function renderViewerHtmlForSpec(
  spec: SpecEntry,
  specs: SpecEntry[],
  options: BetterOpenApiViewerOptions,
  assetPath: string,
  document: OpenAPIObject,
) {
  return renderViewerHtml({
    jsonPath: `/${spec.jsonPath}`,
    title: spec.title ?? options.title ?? document.info?.title ?? spec.name,
    specs: specs.map((item) => ({
      name: item.name,
      path: `/${item.uiPath}`,
      jsonPath: `/${item.jsonPath}`,
    })),
    assetPath: `/${assetPath}`,
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
  });
}

function normalizeRoute(route: string) {
  return route.replace(/^\/+|\/+$/g, '');
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'spec';
}

function renderViewerHtml({
  jsonPath,
  title,
  specs,
  assetPath,
  customCss,
  customCssUrl,
  customJs,
  customJsUrl,
  faviconUrl,
  config,
}: {
  jsonPath: string;
  title: string;
  specs: Array<{ name: string; path: string; jsonPath: string }>;
  assetPath: string;
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
  const serializedConfig = JSON.stringify({ jsonPath, specs, assetPath, ...config }).replace(/</g, '\\u003c');
  const escapedTitle = escapeHtml(title);
  const specLinks =
    specs.length > 1
      ? `<nav aria-label="OpenAPI documents">${specs
          .map((spec) => `<a href="${escapeAttribute(spec.path)}">${escapeHtml(spec.name)}</a>`)
          .join('')}</nav>`
      : '';
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
      nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; }
      nav a { border: 1px solid #ccd2df; border-radius: 8px; color: inherit; padding: 8px 10px; text-decoration: none; }
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
      ${specLinks}
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
  response.header?.('content-type', 'application/json');
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

export function serveBetterOpenApiViewerStaticAssets(path: string) {
  return ({ app, path: mountPath }: { app: INestApplication; path: string }) => {
    const nestApp = app as NestAppWithStaticAssets;
    nestApp.useStaticAssets?.(path, { prefix: mountPath });
  };
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
