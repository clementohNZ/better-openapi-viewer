# Better OpenAPI Viewer

A richer, more usable OpenAPI reference and try-it-out client — built as a drop-in replacement for Swagger UI. Ships as a NestJS adapter today, with a framework-agnostic core designed for other adapters later.

---

## Screenshots

**Operations list & Reference panel**
![Operations list showing 104 endpoints grouped by tag, with the reference panel open for GET /users](docs/screenshots/reference.png)

**Try it out**
![Try-it-out panel with editable parameters, generated curl snippet, and Send request button](docs/screenshots/try-it-out.png)

**Settings → Servers** — configure base URL and per-server credentials (Bearer JWT, API key)
![Settings modal open on the Servers tab showing credential fields for bearer and apiKey schemes](docs/screenshots/settings-servers.png)

**Settings → Cookies** — manage per-server cookies that are forwarded on every try-it-out request
![Settings modal open on the Cookies tab showing the cookie jar for the active server](docs/screenshots/settings-cookies.png)

---

## Features

- **Operations sidebar** — all endpoints grouped by tag, searchable and filterable by HTTP method, tag, and auth state
- **Reference panel** — path, method, operation ID, parameters table (query / header / path), request body schema, response schemas, security requirements, and server list — all at a glance
- **Try it out** — fill parameters and a JSON body editor inline; sends the request from your browser with full header and cookie support
- **Per-server credentials** — bearer JWT and API key fields stored per server, applied automatically to every try-it-out request
- **Cookie jar** — add, edit, and delete cookies per server; the viewer attaches them as a `Cookie` header and merges incoming `Set-Cookie` response headers back (when CORS allows)
- **Generated snippets** — curl and other language snippets generated from the current inputs
- **Multiple specs** — mount several OpenAPI documents under one viewer with tab navigation
- **Dark / light appearance** — follows the OS preference by default, overridable in Settings
- **Zero external CDN** — all assets (JS + CSS) are bundled and served from your own server

---

## Packages

| Package | Description |
|---|---|
| [`@clem/better-openapi-viewer-core`](packages/core) | Framework-agnostic OpenAPI normalisation and viewer primitives |
| [`@clem/better-openapi-viewer-ui`](packages/ui) | React viewer UI, published as both an npm package and a self-contained browser bundle |
| [`@clem/better-openapi-viewer-nestjs`](packages/nestjs) | NestJS adapter — mounts the viewer and serves the OpenAPI JSON |

---

## Installation

### NestJS

```bash
npm install @clem/better-openapi-viewer-nestjs
```

`@clem/better-openapi-viewer-core` and `@clem/better-openapi-viewer-ui` are bundled inside `@clem/better-openapi-viewer-nestjs` — you do not need to install them separately.

---

## NestJS integration

### Minimal setup

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupBetterOpenApiViewer } from '@clem/better-openapi-viewer-nestjs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  setupBetterOpenApiViewer(app, {
    path: 'docs',          // viewer at /docs
    jsonPath: 'docs/openapi.json',
    document,
  });

  await app.listen(3000);
}

void bootstrap();
```

The viewer is then available at `http://localhost:3000/docs` and the raw OpenAPI JSON at `http://localhost:3000/docs/openapi.json`.

---

### Options reference

```ts
setupBetterOpenApiViewer(app, options)
```

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `'docs'` | URL path for the viewer UI |
| `jsonPath` | `string` | `'{path}/openapi.json'` | URL path for the OpenAPI JSON |
| `document` | `OpenAPIObject` | — | Pre-built OpenAPI document |
| `documentFactory` | `() => OpenAPIObject \| Promise<OpenAPIObject>` | — | Lazily-built document (alternative to `document`) |
| `cacheDocument` | `boolean` | `true` | Cache the document after first load (relevant for `documentFactory`) |
| `specs` | `BetterOpenApiViewerSpec[]` | — | Multiple specs — see below |
| `title` | `string` | document `info.title` | Page title and browser tab label |
| `customCss` | `string` | — | Inline CSS injected into the viewer page |
| `customCssUrl` | `string \| string[]` | — | External CSS URL(s) added as `<link>` tags |
| `customJs` | `string` | — | Inline JS injected at the bottom of the page |
| `customJsUrl` | `string \| string[]` | — | External JS URL(s) added as `<script>` tags |
| `faviconUrl` | `string` | — | URL for the page favicon |
| `defaultExpansion` | `'none' \| 'list' \| 'full'` | `'list'` | Initial expansion state for operation groups |
| `deepLinking` | `boolean` | `true` | Sync selected operation to the URL hash |
| `filter` | `boolean \| string` | `true` | Enable the search/filter bar |
| `displayRequestDuration` | `boolean` | `true` | Show request duration after try-it-out |
| `persistAuthorization` | `boolean` | `false` | Persist credentials in localStorage |
| `supportedSubmitMethods` | `string[]` | all methods | HTTP methods that show the Try it out button |
| `staticAssets` | `BetterOpenApiViewerStaticAssetsOptions \| false` | — | Override static asset serving |

---

### Multiple specs

Mount several OpenAPI documents under a single viewer path. Each spec gets its own URL and the viewer renders a navigation tab for each one.

```ts
setupBetterOpenApiViewer(app, {
  path: 'docs',
  specs: [
    {
      name: 'Public API',
      path: 'docs',                        // viewer at /docs
      jsonPath: 'docs/public.json',
      document: publicDocument,
    },
    {
      name: 'Internal API',
      path: 'docs/internal',               // viewer at /docs/internal
      jsonPath: 'docs/internal.json',
      documentFactory: () => buildInternalDocument(),
    },
  ],
});
```

| `specs` field | Type | Description |
|---|---|---|
| `name` | `string` | Display name shown in the spec navigation |
| `path` | `string` | URL path for this spec's viewer UI |
| `jsonPath` | `string` | URL path for this spec's OpenAPI JSON |
| `document` | `OpenAPIObject` | Pre-built document |
| `documentFactory` | `() => OpenAPIObject \| Promise<OpenAPIObject>` | Lazily-built document |
| `title` | `string` | Override the page title for this spec |

---

## Development

```bash
npm install        # install all workspace dependencies
npm run build      # build all packages
npm run dev        # build in watch mode (all packages in parallel)
npm run pack:check # dry-run npm pack for all publishable packages
```

The example app (`apps/example-nest`) starts the viewer at `http://localhost:3000/docs` with 100+ demo endpoints covering varied schemas, auth schemes, and header requirements.

```bash
cd apps/example-nest
npm run start:dev
```

---

## Workspace layout

```
packages/
  core/    – OpenAPI normalisation, types, framework-agnostic helpers
  ui/      – React viewer (also builds a self-contained browser bundle)
  nestjs/  – NestJS adapter
apps/
  example-nest/  – development sandbox with 100+ demo endpoints
```

---

## Publishing

All three packages are versioned together. Adapters pin exact versions of `core` so published packages always work as a matched set.

```bash
npm run pack:check   # verify what would be published
npm publish --workspace @clem/better-openapi-viewer-core
npm publish --workspace @clem/better-openapi-viewer-ui
npm publish --workspace @clem/better-openapi-viewer-nestjs
```
