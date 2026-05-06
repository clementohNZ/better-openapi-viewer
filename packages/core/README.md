# @better-openapi-viewer/core

Framework-agnostic OpenAPI normalization and viewer primitives.

## Current primitives

- Document ingestion helpers for detecting OpenAPI 3.0, OpenAPI 3.1, and Swagger 2.0 documents.
- Internal JSON Pointer `$ref` resolution for pre-normalizing documents.
- Operation extraction with tag, parameter, response, schema, auth, content type, server, and vendor-extension metadata.
- Search, filter, and tag grouping helpers for navigation and discovery.
- Schema tree, schema type, and schema/media/response example helpers for later UI rendering.
- Response normalization helpers with status range/category classification and Swagger 2.0 `produces` fallbacks.
- Request body media type discovery for OpenAPI 3.x `requestBody.content` and Swagger 2.0 body/form parameters.
- Security scheme extraction across OpenAPI 3.x `components.securitySchemes` and Swagger 2.0 `securityDefinitions`.
- Markdown-safe text escaping for descriptions that need to be rendered through Markdown-aware surfaces.
- Try It Out request primitives for server selection and variable substitution, common parameter serialization styles (`form`, `simple`, `spaceDelimited`, `pipeDelimited`, and `deepObject`), request URL/header/cookie/body construction, basic/bearer/api-key credential application, and curl snippet generation.
