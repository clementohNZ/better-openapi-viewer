# @better-openapi-viewer/core

Framework-agnostic OpenAPI normalization and viewer primitives.

## Current primitives

- Document ingestion helpers for detecting OpenAPI 3.0, OpenAPI 3.1, and Swagger 2.0 documents.
- Internal JSON Pointer `$ref` resolution for pre-normalizing documents, plus external `$ref` resolver scaffolding that can call a consumer-provided loader.
- Operation extraction with tag, parameter, response, schema, auth, content type, server, and vendor-extension metadata.
- Search, filter, and tag grouping helpers for navigation and discovery.
- Schema tree, schema type, and schema/media/response example helpers for later UI rendering.
- Response normalization helpers with status range/category classification and Swagger 2.0 `produces` fallbacks.
- Request body media type discovery for OpenAPI 3.x `requestBody.content` and Swagger 2.0 body/form parameters.
- Security scheme extraction across OpenAPI 3.x `components.securitySchemes` and Swagger 2.0 `securityDefinitions`.
- Markdown-safe text escaping for descriptions that need to be rendered through Markdown-aware surfaces.
- Try It Out request primitives for server selection and variable substitution, common parameter serialization styles (`form`, `simple`, `spaceDelimited`, `pipeDelimited`, `deepObject`, `matrix`, and `label`), request URL/header/cookie/body construction, basic/bearer/api-key credential application, request/response interceptor hooks, and curl/fetch/httpie/python snippet generation.
- Viewer configuration primitives for route path, JSON path, title, layout, default expansion, deep linking, filter, request duration display, persisted auth, syntax highlighting, supported submit methods, operation/tag sorters, model expansion depth, and plugin metadata.

## Viewer config

`ViewerConfig` captures the framework-agnostic knobs adapters and UIs can share without depending on a specific renderer. Use `mergeViewerConfig` to layer package defaults, adapter defaults, and user overrides.

```ts
import { mergeViewerConfig } from '@better-openapi-viewer/core';

const config = mergeViewerConfig({
  title: 'Example API',
  defaultExpansion: 'list',
  deepLinking: true,
  filter: true,
  displayRequestDuration: true,
  persistAuthorization: false,
  supportedSubmitMethods: ['get', 'post', 'patch', 'delete'],
  operationsSorter: 'alpha',
  tagsSorter: 'alpha',
  defaultModelExpandDepth: 2,
});
```

`sortOperations`, `sortOperationTags`, and `isSubmitMethodSupported` provide reusable behavior for consumers that want to honor the same configuration in different runtimes.

## Try It Out

`buildTryItOutRequest` builds a framework-neutral request model. Consumers can provide request interceptors before execution and apply response interceptors after their own HTTP client returns.

```ts
import { applyTryItOutResponseInterceptor, buildTryItOutRequest, generateRequestSnippet } from '@better-openapi-viewer/core';

const request = buildTryItOutRequest({
  operation,
  parameters: { id: 42 },
  interceptors: {
    request: (next) => ({ ...next, headers: { ...next.headers, 'X-Client': 'docs' } }),
    response: (next) => next,
  },
});

const snippet = generateRequestSnippet(request, 'fetch');
const response = applyTryItOutResponseInterceptor({ status: 200, headers: {}, body: {} }, { operation }, request);
```

Use `resolveReference(document, ref, { loader })` when a renderer or adapter wants to resolve external references. Internal `#/...` pointers resolve from the provided document first; non-internal refs are fetched only when a loader is supplied.
