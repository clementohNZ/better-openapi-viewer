# @better-openapi-viewer/ui

React UI for Better OpenAPI Viewer.

## Discovery

The viewer renders accessible endpoint navigation with operation counts, text search, and filters for HTTP method, tag, auth requirement, deprecated status, and documented content types when those values are available from the normalized OpenAPI document.

## Try It Out

Expanded operations include an opt-in Try It Out panel. Users can choose a server and request content type when available, edit parameter values and raw body text, inspect the generated URL, headers, body, and curl command, send the request with `fetch`, review response status, duration, headers, and body, and reset inputs back to documented examples/defaults.

## Authorization

The viewer detects supported OpenAPI and Swagger security schemes from `components.securitySchemes` and `securityDefinitions`. A global Authorize panel lets users enter Basic auth, Bearer tokens, and apiKey credentials for header, query, or cookie locations, then applies those credentials to Try It Out requests through the core request builder. Credentials can be cleared per scheme or globally.

Pass `persistAuthorization` to store entered credentials for the current API document in `localStorage`.
