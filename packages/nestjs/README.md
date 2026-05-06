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
