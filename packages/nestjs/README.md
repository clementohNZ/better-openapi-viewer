# @better-openapi-viewer/nestjs

NestJS adapter for Better OpenAPI Viewer.

## Usage

```ts
import { SwaggerModule } from '@nestjs/swagger';
import { setupBetterOpenApiViewer } from '@better-openapi-viewer/nestjs';

const document = SwaggerModule.createDocument(app, swaggerConfig);

setupBetterOpenApiViewer(app, {
  path: 'docs',
  jsonPath: 'docs/openapi.json',
  document,
  title: 'Example API',
  defaultExpansion: 'list',
  deepLinking: true,
  filter: true,
  displayRequestDuration: true,
  supportedSubmitMethods: ['get', 'post', 'patch', 'delete'],
  persistAuthorization: false,
});
```

The adapter serves the OpenAPI JSON document and a lightweight viewer shell without changing NestJS decorators or `@nestjs/swagger` document generation.

## Multiple Documents

Use `specs` when the same NestJS app exposes more than one OpenAPI document. Each spec gets its own JSON endpoint, and the viewer renders a small document switcher.

```ts
setupBetterOpenApiViewer(app, {
  path: 'docs',
  specs: [
    {
      name: 'Public API',
      path: 'docs/public',
      jsonPath: 'docs/public/openapi.json',
      document: publicDocument,
    },
    {
      name: 'Admin API',
      path: 'docs/admin',
      jsonPath: 'docs/admin/openapi.json',
      documentFactory: () => SwaggerModule.createDocument(app, adminSwaggerConfig),
    },
  ],
});
```

When `path` or `jsonPath` are omitted on a spec, the adapter derives stable routes from the top-level `path` and the spec name.

## Static Assets

The fallback shell supports custom CSS and JavaScript URLs today. If you bundle additional UI assets in your application, pass a thin serving hook and the public mount path:

```ts
import { join } from 'node:path';
import { serveBetterOpenApiViewerStaticAssets } from '@better-openapi-viewer/nestjs';

setupBetterOpenApiViewer(app, {
  document,
  staticAssets: {
    path: 'docs/assets',
    serve: serveBetterOpenApiViewerStaticAssets(join(process.cwd(), 'public/openapi-viewer')),
  },
});
```

The helper calls Nest's `useStaticAssets` when the active platform exposes it. You can provide your own `serve` callback for adapter-specific setup.
