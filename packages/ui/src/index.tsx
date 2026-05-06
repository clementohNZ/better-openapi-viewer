import { getOperations, type OpenAPIObject } from '@better-openapi-viewer/core';

export type BetterOpenApiViewerProps = {
  document: OpenAPIObject;
};

export function BetterOpenApiViewer({ document }: BetterOpenApiViewerProps) {
  const endpoints = getOperations(document);

  return (
    <main>
      <header>
        <p>{document.info?.version}</p>
        <h1>{document.info?.title ?? 'OpenAPI'}</h1>
        {document.info?.description ? <p>{document.info.description}</p> : null}
      </header>

      <section>
        <h2>Endpoints</h2>
        <ul>
          {endpoints.map((endpoint) => (
            <li key={endpoint.id}>
              <strong>{endpoint.method}</strong> {endpoint.path}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export type { OpenAPIObject };
