# Swagger UI Parity Roadmap

This project should treat the OpenAPI document as the source of truth. The core and UI packages should be framework-agnostic. The NestJS package should hook into `@nestjs/swagger` output and serve a richer UI without requiring different decorators, controller annotations, or schema generation behavior.

## 1. OpenAPI Document Loading

- [x] Load OpenAPI JSON from a configured endpoint.
- [x] Accept a prebuilt OpenAPI object from `SwaggerModule.createDocument`.
- [x] Support OpenAPI 3.0, OpenAPI 3.1, and Swagger/OpenAPI 2.0 where practical.
- [x] Resolve internal `$ref` pointers.
- [x] Resolve external `$ref` pointers where browser and server configuration allow it.
- [x] Show useful loading, parse, validation, and unsupported-version errors.
- [ ] Support multiple specs or grouped definitions when an app exposes more than one document.
- [x] Preserve vendor extensions such as `x-*` fields for later rendering and plugins.

## 2. Navigation And Discovery

- [x] Group operations by tag.
- [x] Support untagged operations.
- [x] Show method, path, summary, operation id, tags, and deprecation state.
- [x] Expand and collapse all operations.
- [x] Deep link to tags and operations.
- [x] Preserve selected operation in the URL.
- [x] Search by path, method, summary, description, tag, operation id, parameter name, schema name, status code, and free text.
- [x] Filter by method, tag, auth requirement, deprecation, and content type.
- [x] Handle large API documents without slow rendering.

## 3. Operation Documentation

- [ ] Render Markdown descriptions.
- [x] Show operation summary and full description.
- [x] Show external docs links.
- [x] Show deprecation warnings.
- [x] Show servers inherited from the root, path, or operation.
- [x] Show request method and full resolved URL.
- [x] Show operation-specific security requirements.
- [x] Show callbacks and webhooks when present.

## 4. Parameters

- [x] Render path, query, header, and cookie parameters.
- [x] Show required, optional, deprecated, nullable, read-only, write-only, and default states.
- [x] Render primitive, array, object, enum, and composed parameter schemas.
- [x] Support parameter examples and example values.
- [x] Support OpenAPI serialization styles: `form`, `simple`, `matrix`, `label`, `spaceDelimited`, `pipeDelimited`, and `deepObject`.
- [ ] Validate parameter input before sending a request.
- [x] Encode parameters correctly into URL paths, query strings, headers, and cookies.

## 5. Request Bodies

- [x] Render request body descriptions.
- [x] Support required and optional request bodies.
- [x] Support multiple media types such as `application/json`, `multipart/form-data`, `application/x-www-form-urlencoded`, `text/plain`, and binary uploads.
- [x] Generate editable example payloads from schema examples, explicit examples, defaults, and schema shape.
- [ ] Render schema-aware forms for request bodies.
- [x] Support raw body editing.
- [ ] Validate request bodies before sending.
- [ ] Support file upload fields.
- [x] Support arrays, nested objects, maps, enums, nullable values, and composition.

## 6. Schemas And Models

- [x] Render component schemas.
- [x] Render inline schemas.
- [x] Resolve references.
- [x] Show property names, types, formats, descriptions, constraints, examples, defaults, required fields, deprecated fields, nullable fields, read-only fields, and write-only fields.
- [x] Support `allOf`, `oneOf`, `anyOf`, `not`, discriminators, inheritance-like models, and circular references.
- [x] Support JSON Schema keywords used by OpenAPI 3.1.
- [x] Show enum values clearly.
- [x] Provide example generation for schemas.
- [x] Support model expand and collapse behavior.

## 7. Responses

- [x] Show all possible response status codes.
- [x] Show response descriptions.
- [x] Show response headers.
- [x] Show response links.
- [x] Show response body media types.
- [x] Render response schemas.
- [x] Render response examples.
- [x] Support default responses.
- [x] Highlight success, redirect, client error, and server error ranges.
- [x] After an executed request, show status, duration, response headers, response body, and raw response.

## 8. Try It Out

- [x] Enable and disable execution globally.
- [x] Enable and disable execution per operation.
- [x] Let users edit path, query, header, cookie, and body inputs.
- [x] Build the request URL from selected server, path templating, and serialized parameters.
- [x] Send requests with the selected HTTP method.
- [x] Support JSON, form, multipart, text, binary, and empty request bodies.
- [x] Show generated curl or equivalent command.
- [x] Show request headers and body before sending.
- [x] Cancel in-flight requests.
- [x] Reset inputs to defaults.
- [x] Respect CORS and surface actionable browser/network errors.
- [x] Support request and response interceptors.

## 9. Authentication And Authorization

- [x] Render an authorize control when security schemes exist.
- [x] Support HTTP Basic auth.
- [x] Support HTTP Bearer auth.
- [x] Support API keys in headers, query parameters, and cookies.
- [ ] Support OAuth 2.0 flows: authorization code, implicit, password, and client credentials.
- [ ] Support OpenID Connect discovery.
- [x] Support OAuth scopes and operation-specific scope requirements.
- [x] Support multiple simultaneous auth schemes when OpenAPI requires them.
- [x] Support alternative auth choices when OpenAPI allows them.
- [x] Persist auth optionally.
- [x] Clear auth globally and per scheme.
- [ ] Preauthorize credentials through package configuration.
- [x] Attach auth credentials correctly during Try It Out requests.

## 10. Server Selection

- [x] Render root, path-level, and operation-level servers.
- [ ] Support server variables and defaults.
- [x] Allow switching the active server.
- [x] Apply selected server to Try It Out requests.
- [x] Handle relative server URLs for same-origin NestJS apps.

## 11. Generated Snippets

- [x] Generate curl snippets.
- [x] Support request snippets for common clients over time, such as JavaScript `fetch`, Node, Python, Go, and HTTPie.
- [x] Include selected server, auth, headers, parameters, and body in snippets.
- [x] Keep snippets synchronized with user-edited request inputs.

## 12. Configuration Parity

- [x] Support package-level configuration for route path, JSON path, title, layout, default expansion, deep linking, filtering, display request duration, persisted authorization, syntax highlighting, supported submit methods, and custom plugins.
- [x] Support hiding or disabling Try It Out.
- [x] Support custom request and response interceptors.
- [x] Support custom operation sorting and tag sorting.
- [x] Support custom default model expansion depth.
- [x] Support custom docs title, favicon, CSS, and injected assets.

## 13. UX, Accessibility, And Theming

- [x] Provide keyboard-friendly navigation and forms.
- [x] Meet basic screen reader semantics for operations, tabs, dialogs, forms, and response panels.
- [x] Support light and dark themes.
- [x] Support responsive layouts for desktop and mobile.
- [x] Keep large schemas and large responses readable.
- [x] Provide copy buttons for URLs, operation ids, snippets, examples, and responses.
- [x] Provide empty states and error states.

## 14. NestJS Integration

- [x] Work with `SwaggerModule.createDocument` output.
- [x] Serve the viewer without changing NestJS decorators or annotations.
- [x] Expose the OpenAPI JSON endpoint.
- [x] Allow mounting under any route prefix.
- [x] Work with global prefixes.
- [ ] Work with Express and Fastify adapters.
- [x] Allow users to keep the standard Swagger UI route if they want both UIs.
- [ ] Support static asset serving for the bundled UI.
- [x] Support app lifecycle timing where the OpenAPI document is created after modules initialize.

## Suggested Implementation Order

1. Document ingestion, normalized operation model, and large-spec search.
2. Operation documentation, parameters, request bodies, schemas, and responses.
3. Try It Out request builder and response viewer.
4. Auth schemes and server selection.
5. Snippets, config parity, theming, accessibility, and plugin hooks.
6. Fastify support, multiple specs, and advanced OpenAPI 3.1/schema edge cases.

## Architecture Constraint

Shared OpenAPI behavior belongs in `@better-openapi-viewer/core`, browser rendering belongs in `@better-openapi-viewer/ui`, and framework-specific mounting belongs in adapters such as `@better-openapi-viewer/nestjs`. NestJS should be a consumer of the viewer, not the architecture root.
