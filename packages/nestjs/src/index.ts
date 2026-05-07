import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@clem/better-openapi-viewer-core';

const require = createRequire(import.meta.url);

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
  const bundledViewerAssetPath = `/${assetPath}/viewer.js`;
  const bundledViewerStylePath = `/${assetPath}/viewer.css`;

  if (staticAssets) {
    staticAssets.serve?.({ app, path: `/${assetPath}` });
  }

  registerGet(app, bundledViewerAssetPath, async (_request, response) => {
    sendJavaScript(response, await readFile(require.resolve('@clem/better-openapi-viewer-ui/browser'), 'utf8'));
  });

  registerGet(app, bundledViewerStylePath, async (_request, response) => {
    sendCss(response, await readFile(require.resolve('@clem/better-openapi-viewer-ui/browser-style'), 'utf8'));
  });

  specs.forEach((spec) => {
    registerGet(app, `/${spec.jsonPath}`, async (_request, response) => {
      sendJson(response, await spec.getDocument());
    });
  });

  specs
    .filter((spec) => spec.uiPath !== uiPath)
    .forEach((spec) => {
      registerGet(app, `/${spec.uiPath}`, async (_request, response) => {
        sendHtml(response, renderViewerHtmlForSpec(spec, specs, options, bundledViewerAssetPath, bundledViewerStylePath, await spec.getDocument()));
      });
    });

  registerGet(app, `/${uiPath}`, async (_request, response) => {
    const spec = specs[0] as SpecEntry;
    sendHtml(response, renderViewerHtmlForSpec(spec, specs, options, bundledViewerAssetPath, bundledViewerStylePath, await spec.getDocument()));
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
  bundledViewerAssetPath: string,
  bundledViewerStylePath: string,
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
    bundledViewerAssetPath,
    bundledViewerStylePath,
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
  bundledViewerAssetPath,
  bundledViewerStylePath,
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
  bundledViewerAssetPath: string;
  bundledViewerStylePath: string;
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
  const serializedConfig = JSON.stringify({ jsonPath, specs, ...config }).replace(/</g, '\\u003c');
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
    <link rel="stylesheet" href="${escapeAttribute(bundledViewerStylePath)}" />
    ${cssLinks}
    <style>
      ${customCss ?? ''}
    </style>
  </head>
  <body>
    <div data-better-openapi-viewer-root>
      <main class="bov">
        ${specLinks}
        <section class="bov-loading" aria-label="Loading API documentation">
          <p class="bov-kicker">OpenAPI document: <a href="${jsonPath}">${jsonPath}</a></p>
          <h1>${escapedTitle}</h1>
          <p class="bov-muted" role="status">Loading Better OpenAPI Viewer...</p>
          <div class="bov-skeleton-stack" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </section>
      </main>
    </div>
    <script>
      window.__BETTER_OPENAPI_VIEWER_CONFIG__ = ${serializedConfig};
    </script>
    <script src="${escapeAttribute(bundledViewerAssetPath)}"></script>
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

function sendJavaScript(response: HtmlResponse, value: string) {
  response.type?.('application/javascript');
  response.header?.('content-type', 'application/javascript');
  response.send(value);
}

function sendCss(response: HtmlResponse, value: string) {
  response.type?.('text/css');
  response.header?.('content-type', 'text/css');
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
