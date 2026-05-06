# Better OpenAPI Viewer

A Turborepo workspace for building a richer, framework-agnostic OpenAPI viewer.

NestJS is the first adapter because that is the initial production target. The core OpenAPI behavior and viewer UI are intentionally separated so other frameworks can use the same UI later.

## Workspace

- `apps/example-nest`: a small NestJS app that mounts the viewer.
- `packages/core`: framework-agnostic OpenAPI normalization, search, and future request/auth helpers.
- `packages/ui`: shared viewer UI package.
- `packages/nestjs`: NestJS integration helpers.

## Commands

```bash
npm install
npm run build
npm run pack:check
npm run dev
```

## Publishing Model

The public packages are versioned together:

- `@better-openapi-viewer/core`
- `@better-openapi-viewer/ui`
- `@better-openapi-viewer/nestjs`

Adapters depend on the exact matching `core` version so published packages work together predictably.
