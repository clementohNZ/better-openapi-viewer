# Architecture

Better OpenAPI Viewer is framework-agnostic at its center. NestJS is the first adapter because this project starts from NestJS usage, but the UI and OpenAPI behavior should be usable by Express, Fastify, Hono, Next.js, plain static hosting, and other frameworks.

## Package Boundaries

### `@better-openapi-viewer/core`

Owns OpenAPI behavior that does not depend on React, NestJS, or a server framework.

- OpenAPI document types and normalization.
- Operation extraction and indexing.
- Search and filtering primitives.
- `$ref` resolution helpers.
- Server URL selection.
- Parameter serialization.
- Request construction for Try It Out.
- Auth credential application.
- Example generation.
- Response normalization.

This package should be usable in browsers and Node.js.

### `@better-openapi-viewer/ui`

Owns the browser UI.

- React components.
- Layout, navigation, operation panels, schema views, auth dialogs, and request forms.
- Calls `core` for OpenAPI logic instead of reimplementing spec behavior in components.
- Accepts either an OpenAPI object or a URL to fetch.
- Can be bundled as a component library and as static assets for framework adapters.

This package should not import NestJS or any server framework.

### `@better-openapi-viewer/nestjs`

Owns NestJS integration only.

- Accepts a document from `SwaggerModule.createDocument`.
- Optionally accepts a document factory.
- Serves the OpenAPI JSON endpoint.
- Serves the viewer HTML/static assets.
- Handles Nest route prefix and adapter concerns.
- Works without changing controller decorators or `@nestjs/swagger` annotations.

This package should be thin. If logic would also apply to Express, Fastify, or static hosting, it belongs in `core` or `ui`.

### Future Adapters

Potential adapters should wrap the same core and UI:

- `@better-openapi-viewer/express`
- `@better-openapi-viewer/fastify`
- `@better-openapi-viewer/hono`
- `@better-openapi-viewer/next`
- `@better-openapi-viewer/static`

## Dependency Direction

```text
framework adapters -> ui -> core
framework adapters -> core
```

The reverse should never happen:

- `core` must not import `ui`.
- `core` must not import framework adapters.
- `ui` must not import NestJS, Express, Fastify, or Hono.
- Framework adapters should not duplicate OpenAPI parsing, searching, auth, or request-building behavior.

## Runtime Shape

1. A framework adapter receives or creates an OpenAPI document.
2. The adapter exposes the document at a JSON endpoint.
3. The adapter serves the viewer app.
4. The viewer fetches or receives the document.
5. The viewer asks `core` to normalize, index, search, render operation metadata, build requests, apply auth, and interpret responses.

## First Implementation Milestones

1. Move OpenAPI types and operation extraction into `core`.
2. Make the current UI consume `core` search/index primitives.
3. Make the NestJS adapter serve a minimal framework-neutral viewer shell.
4. Add request-building to `core`.
5. Add Try It Out UI using the core request builder.
6. Add auth primitives to `core`, then render auth controls in `ui`.
