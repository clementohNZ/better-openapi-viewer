# @better-openapi-viewer/core

Framework-agnostic OpenAPI normalization and viewer primitives.

## Current primitives

- Document ingestion helpers for detecting OpenAPI 3.0, OpenAPI 3.1, and Swagger 2.0 documents.
- Internal JSON Pointer `$ref` resolution for pre-normalizing documents.
- Operation extraction with tag, parameter, response, schema, auth, content type, server, and vendor-extension metadata.
- Search, filter, and tag grouping helpers for navigation and discovery.
- Schema and media type example helpers for later UI rendering.
