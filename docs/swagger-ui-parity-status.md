# Swagger UI Parity Status

This project now has first-pass parity coverage across the main Swagger UI workflows while keeping the architecture split between `core`, `ui`, and `nestjs`.

## Implemented

- OpenAPI 3.0, OpenAPI 3.1, and Swagger 2.0 version detection.
- Internal `$ref` resolution helpers.
- Normalized operation extraction, tag grouping, search, filters, sorters, and vendor extension preservation.
- Operation docs for summaries, descriptions, external docs, parameters, request bodies, responses, callbacks, webhooks, servers, and security requirements.
- Component schema/model rendering with schema tree helpers and generated examples.
- Response normalization with status range classification, headers, links, media types, schemas, and examples.
- Try It Out request building with server selection, parameter serialization, auth application, generated curl, request preview, execution, errors, duration, response headers, and response body.
- Authorization controls for HTTP Basic, HTTP Bearer, and API keys in headers, query parameters, and cookies.
- Viewer configuration primitives for route paths, JSON paths, title, default expansion, deep linking, filtering, duration display, persisted auth, syntax highlighting, submit methods, sorters, model depth, and plugins.
- NestJS setup from `SwaggerModule.createDocument`, JSON endpoint serving, lazy document factories, custom CSS/JS/favicons, configurable mounting path, and a lightweight static fallback shell.
- Example NestJS fixture covering tags, query/header/path params, JSON bodies, bearer auth, servers, and multiple methods.
- Build, package dry-run, and npm publish workflow.

## Scaffolded Or Partial

- External `$ref` resolution is represented by core resolver primitives but depends on host-provided loading policy.
- OAuth 2.0 and OpenID Connect schemes are displayed as requirements, but full browser auth flows still need provider-specific UI.
- Request body forms are raw/editor-first with schema examples; full schema-aware nested form controls remain future UI work.
- Multipart, file upload, binary, and urlencoded request bodies have request-builder coverage foundations but need richer browser controls.
- Multiple specs/grouped definitions need an adapter-level selection UI.
- Fastify-specific adapter behavior is not separately exercised yet.
- The NestJS adapter serves a static fallback shell today; bundling the full React UI as static assets is the next packaging milestone.
