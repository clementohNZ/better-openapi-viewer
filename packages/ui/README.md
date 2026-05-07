# @clementoh/better-openapi-viewer-ui

React UI for Better OpenAPI Viewer.

## Discovery

The viewer renders accessible endpoint navigation with operation counts, text search, and filters for HTTP method, tag, auth requirement, deprecated status, and documented content types when those values are available from the normalized OpenAPI document. It also renders component schemas and Swagger definitions in a Models section using the core schema tree helpers.

Expanded operations show structured request body media types, schema property trees, documented examples, response status class labels, response descriptions, response content examples, external docs links, and callback/webhook summaries when present. Common Markdown-style description text is rendered safely as React text and elements without adding a Markdown dependency.

## Try It Out

Expanded operations include a globally controllable, opt-in Try It Out panel. Users can choose a server, fill server variables, select a request content type, edit parameter values, use generated controls for JSON object request body fields, upload files for documented `multipart/form-data` binary fields, inspect and copy the generated URL, body, and snippet, send or cancel the request with `fetch` and `AbortController`, review response status, duration, headers, and body, copy the response body, and reset inputs back to documented examples/defaults.

Before sending, the UI reports missing required parameters, missing required request bodies or multipart fields, and invalid JSON request bodies.

The snippet selector currently exposes curl, backed by the core curl snippet generator.

## Authorization

The viewer detects supported OpenAPI and Swagger security schemes from `components.securitySchemes` and `securityDefinitions`. A global Authorize panel lets users enter Basic auth, Bearer tokens, apiKey credentials for header, query, or cookie locations, and access-token style values for OAuth/OpenID schemes where the core request builder can apply bearer-style credentials. OAuth flows and OpenID Connect discovery URLs are displayed when documented. Credentials can be cleared per scheme or globally.

Pass `persistAuthorization` to store entered credentials for the current API document in `localStorage`.

Pass `preauthorizedCredentials` or `config.preauthorizedCredentials` to seed the Authorize panel, for example:

```tsx
<BetterOpenApiViewer
  document={document}
  preauthorizedCredentials={{
    bearerAuth: 'token',
    basicAuth: { username: 'demo', password: 'secret' },
  }}
/>
```

## Theme

The viewer includes accessible light and dark theme controls on the root UI and exposes the selected value with a `data-theme` attribute for host applications to style.
