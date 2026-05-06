# Swagger UI Parity Roadmap

This project should treat the OpenAPI document as the source of truth. The core and UI packages should be framework-agnostic. The NestJS package should hook into `@nestjs/swagger` output and serve a richer UI without requiring different decorators, controller annotations, or schema generation behavior.

## 1. OpenAPI Document Loading

- Load OpenAPI JSON from a configured endpoint.
- Accept a prebuilt OpenAPI object from `SwaggerModule.createDocument`.
- Support OpenAPI 3.0, OpenAPI 3.1, and Swagger/OpenAPI 2.0 where practical.
- Resolve internal `$ref` pointers.
- Resolve external `$ref` pointers where browser and server configuration allow it.
- Show useful loading, parse, validation, and unsupported-version errors.
- Support multiple specs or grouped definitions when an app exposes more than one document.
- Preserve vendor extensions such as `x-*` fields for later rendering and plugins.

## 2. Navigation And Discovery

- Group operations by tag.
- Support untagged operations.
- Show method, path, summary, operation id, tags, and deprecation state.
- Expand and collapse all operations.
- Deep link to tags and operations.
- Preserve selected operation in the URL.
- Search by path, method, summary, description, tag, operation id, parameter name, schema name, status code, and free text.
- Filter by method, tag, auth requirement, deprecation, and content type.
- Handle large API documents without slow rendering.

## 3. Operation Documentation

- Render Markdown descriptions.
- Show operation summary and full description.
- Show external docs links.
- Show deprecation warnings.
- Show servers inherited from the root, path, or operation.
- Show request method and full resolved URL.
- Show operation-specific security requirements.
- Show callbacks and webhooks when present.

## 4. Parameters

- Render path, query, header, and cookie parameters.
- Show required, optional, deprecated, nullable, read-only, write-only, and default states.
- Render primitive, array, object, enum, and composed parameter schemas.
- Support parameter examples and example values.
- Support OpenAPI serialization styles: `form`, `simple`, `matrix`, `label`, `spaceDelimited`, `pipeDelimited`, and `deepObject`.
- Validate parameter input before sending a request.
- Encode parameters correctly into URL paths, query strings, headers, and cookies.

## 5. Request Bodies

- Render request body descriptions.
- Support required and optional request bodies.
- Support multiple media types such as `application/json`, `multipart/form-data`, `application/x-www-form-urlencoded`, `text/plain`, and binary uploads.
- Generate editable example payloads from schema examples, explicit examples, defaults, and schema shape.
- Render schema-aware forms for request bodies.
- Support raw body editing.
- Validate request bodies before sending.
- Support file upload fields.
- Support arrays, nested objects, maps, enums, nullable values, and composition.

## 6. Schemas And Models

- Render component schemas.
- Render inline schemas.
- Resolve references.
- Show property names, types, formats, descriptions, constraints, examples, defaults, required fields, deprecated fields, nullable fields, read-only fields, and write-only fields.
- Support `allOf`, `oneOf`, `anyOf`, `not`, discriminators, inheritance-like models, and circular references.
- Support JSON Schema keywords used by OpenAPI 3.1.
- Show enum values clearly.
- Provide example generation for schemas.
- Support model expand and collapse behavior.

## 7. Responses

- Show all possible response status codes.
- Show response descriptions.
- Show response headers.
- Show response links.
- Show response body media types.
- Render response schemas.
- Render response examples.
- Support default responses.
- Highlight success, redirect, client error, and server error ranges.
- After an executed request, show status, duration, response headers, response body, and raw response.

## 8. Try It Out

- Enable and disable execution globally.
- Enable and disable execution per operation.
- Let users edit path, query, header, cookie, and body inputs.
- Build the request URL from selected server, path templating, and serialized parameters.
- Send requests with the selected HTTP method.
- Support JSON, form, multipart, text, binary, and empty request bodies.
- Show generated curl or equivalent command.
- Show request headers and body before sending.
- Cancel in-flight requests.
- Reset inputs to defaults.
- Respect CORS and surface actionable browser/network errors.
- Support request and response interceptors.

## 9. Authentication And Authorization

- Render an authorize control when security schemes exist.
- Support HTTP Basic auth.
- Support HTTP Bearer auth.
- Support API keys in headers, query parameters, and cookies.
- Support OAuth 2.0 flows: authorization code, implicit, password, and client credentials.
- Support OpenID Connect discovery.
- Support OAuth scopes and operation-specific scope requirements.
- Support multiple simultaneous auth schemes when OpenAPI requires them.
- Support alternative auth choices when OpenAPI allows them.
- Persist auth optionally.
- Clear auth globally and per scheme.
- Preauthorize credentials through package configuration.
- Attach auth credentials correctly during Try It Out requests.

## 10. Server Selection

- Render root, path-level, and operation-level servers.
- Support server variables and defaults.
- Allow switching the active server.
- Apply selected server to Try It Out requests.
- Handle relative server URLs for same-origin NestJS apps.

## 11. Generated Snippets

- Generate curl snippets.
- Support request snippets for common clients over time, such as JavaScript `fetch`, Node, Python, Go, and HTTPie.
- Include selected server, auth, headers, parameters, and body in snippets.
- Keep snippets synchronized with user-edited request inputs.

## 12. Configuration Parity

- Support package-level configuration for route path, JSON path, title, layout, default expansion, deep linking, filtering, display request duration, persisted authorization, syntax highlighting, supported submit methods, and custom plugins.
- Support hiding or disabling Try It Out.
- Support custom request and response interceptors.
- Support custom operation sorting and tag sorting.
- Support custom default model expansion depth.
- Support custom docs title, favicon, CSS, and injected assets.

## 13. UX, Accessibility, And Theming

- Provide keyboard-friendly navigation and forms.
- Meet basic screen reader semantics for operations, tabs, dialogs, forms, and response panels.
- Support light and dark themes.
- Support responsive layouts for desktop and mobile.
- Keep large schemas and large responses readable.
- Provide copy buttons for URLs, operation ids, snippets, examples, and responses.
- Provide empty states and error states.

## 14. NestJS Integration

- Work with `SwaggerModule.createDocument` output.
- Serve the viewer without changing NestJS decorators or annotations.
- Expose the OpenAPI JSON endpoint.
- Allow mounting under any route prefix.
- Work with global prefixes.
- Work with Express and Fastify adapters.
- Allow users to keep the standard Swagger UI route if they want both UIs.
- Support static asset serving for the bundled UI.
- Support app lifecycle timing where the OpenAPI document is created after modules initialize.

## Suggested Implementation Order

1. Document ingestion, normalized operation model, and large-spec search.
2. Operation documentation, parameters, request bodies, schemas, and responses.
3. Try It Out request builder and response viewer.
4. Auth schemes and server selection.
5. Snippets, config parity, theming, accessibility, and plugin hooks.
6. Fastify support, multiple specs, and advanced OpenAPI 3.1/schema edge cases.

## Architecture Constraint

Shared OpenAPI behavior belongs in `@better-openapi-viewer/core`, browser rendering belongs in `@better-openapi-viewer/ui`, and framework-specific mounting belongs in adapters such as `@better-openapi-viewer/nestjs`. NestJS should be a consumer of the viewer, not the architecture root.
