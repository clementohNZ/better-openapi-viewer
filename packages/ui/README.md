# @better-openapi-viewer/ui

React UI for Better OpenAPI Viewer.

## Discovery

The viewer renders accessible endpoint navigation with operation counts, text search, and filters for HTTP method, tag, auth requirement, deprecated status, and documented content types when those values are available from the normalized OpenAPI document. It also renders component schemas and Swagger definitions in a Models section using the core schema tree helpers.

Expanded operations show structured request body media types, schema property trees, documented examples, response status class labels, response descriptions, response content examples, external docs links, and callback/webhook summaries when present.

## Try It Out

Expanded operations include a globally controllable, opt-in Try It Out panel. Users can choose a server and request content type when available, edit parameter values and raw body text, inspect and copy the generated URL, body, and curl snippet, send or cancel the request with `fetch` and `AbortController`, review response status, duration, headers, and body, copy the response body, and reset inputs back to documented examples/defaults.

The snippet selector currently exposes curl, backed by the core curl snippet generator.

## Authorization

The viewer detects supported OpenAPI and Swagger security schemes from `components.securitySchemes` and `securityDefinitions`. A global Authorize panel lets users enter Basic auth, Bearer tokens, and apiKey credentials for header, query, or cookie locations, then applies those credentials to Try It Out requests through the core request builder. Credentials can be cleared per scheme or globally.

Pass `persistAuthorization` to store entered credentials for the current API document in `localStorage`.

## Theme

The viewer includes accessible light and dark theme controls on the root UI and exposes the selected value with a `data-theme` attribute for host applications to style.
