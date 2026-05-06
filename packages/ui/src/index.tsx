import { useMemo, useState } from 'react';
import {
  getOperations,
  groupOperationsByTag,
  searchOperations,
  type NormalizedOperation,
  type OpenAPIObject,
  type ParameterObject,
  type ReferenceObject,
  type SecurityRequirementObject,
  type ServerObject,
} from '@better-openapi-viewer/core';

export type BetterOpenApiViewerProps = {
  document: OpenAPIObject;
};

export function BetterOpenApiViewer({ document }: BetterOpenApiViewerProps) {
  const [query, setQuery] = useState('');
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(() => new Set());
  const operations = useMemo(() => getOperations(document), [document]);
  const filteredOperations = useMemo(() => searchOperations(operations, query), [operations, query]);
  const groupedOperations = useMemo(() => groupOperationsByTag(filteredOperations, document.tags), [document.tags, filteredOperations]);

  const toggleOperation = (operationId: string) => {
    setExpandedOperations((current) => {
      const next = new Set(current);

      if (next.has(operationId)) {
        next.delete(operationId);
      } else {
        next.add(operationId);
      }

      return next;
    });
  };

  const expandAll = () => setExpandedOperations(new Set(filteredOperations.map((operation) => operation.id)));
  const collapseAll = () => setExpandedOperations(new Set());

  return (
    <main>
      <header>
        {document.info?.version ? <p>{document.info.version}</p> : null}
        <h1>{document.info?.title ?? 'OpenAPI'}</h1>
        {document.info?.description ? <p>{document.info.description}</p> : null}
      </header>

      <section aria-labelledby="endpoint-navigation-heading">
        <h2 id="endpoint-navigation-heading">Endpoints</h2>
        <label>
          Search endpoints
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Method, path, tag, summary, parameter..."
          />
        </label>

        <nav aria-label="Endpoint navigation">
          {groupedOperations.length ? (
            groupedOperations.map(({ name, operations: tagOperations }) => (
              <section key={name} aria-labelledby={`tag-nav-${toDomId(name)}`}>
                <h3 id={`tag-nav-${toDomId(name)}`}>{name}</h3>
                <ul>
                  {tagOperations.map((operation) => (
                    <li key={`${name}:${operation.id}`}>
                      <a href={`#operation-${toDomId(operation.id)}`}>
                        <MethodLabel method={operation.method} /> {operation.path}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p>No endpoints match your search.</p>
          )}
        </nav>
      </section>

      <section aria-labelledby="operations-heading">
        <h2 id="operations-heading">Operations</h2>
        <div>
          <button type="button" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
        {groupedOperations.map(({ name, description, operations: tagOperations }) => (
          <section key={name} aria-labelledby={`tag-${toDomId(name)}`}>
            <h3 id={`tag-${toDomId(name)}`}>{name}</h3>
            {description ? <p>{description}</p> : null}

            <ul>
              {tagOperations.map((operation) => {
                const isExpanded = expandedOperations.has(operation.id);

                return (
                  <li key={`${name}:${operation.id}`} id={`operation-${toDomId(operation.id)}`}>
                    <article>
                      <header>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`operation-details-${toDomId(operation.id)}`}
                          onClick={() => toggleOperation(operation.id)}
                        >
                          <MethodLabel method={operation.method} /> <code>{operation.path}</code>
                          {operation.summary ? <span> {operation.summary}</span> : null}
                          {operation.deprecated ? <strong> Deprecated</strong> : null}
                        </button>
                      </header>

                      {isExpanded ? (
                        <div id={`operation-details-${toDomId(operation.id)}`}>
                          <OperationOverview operation={operation} />
                          <Parameters parameters={operation.parameters} />
                          <UnknownObjectSection title="Request body" value={operation.requestBody} emptyMessage="No request body." />
                          <UnknownRecordSection title="Responses" value={operation.responses} emptyMessage="No responses documented." />
                          <Security security={operation.security} />
                          <Servers servers={operation.servers} />
                        </div>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </section>
    </main>
  );
}

export type { OpenAPIObject };

function OperationOverview({ operation }: { operation: NormalizedOperation }) {
  return (
    <section aria-labelledby={`${toDomId(operation.id)}-overview`}>
      <h4 id={`${toDomId(operation.id)}-overview`}>Overview</h4>
      <dl>
        <div>
          <dt>Method</dt>
          <dd>
            <MethodLabel method={operation.method} />
          </dd>
        </div>
        <div>
          <dt>Path</dt>
          <dd>
            <code>{operation.path}</code>
          </dd>
        </div>
        {operation.operationId ? (
          <div>
            <dt>Operation ID</dt>
            <dd>
              <code>{operation.operationId}</code>
            </dd>
          </div>
        ) : null}
        {operation.summary ? (
          <div>
            <dt>Summary</dt>
            <dd>{operation.summary}</dd>
          </div>
        ) : null}
        {operation.description ? (
          <div>
            <dt>Description</dt>
            <dd>{operation.description}</dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd>{operation.deprecated ? 'Deprecated' : 'Active'}</dd>
        </div>
      </dl>
    </section>
  );
}

function Parameters({ parameters }: { parameters: Array<ParameterObject | ReferenceObject> }) {
  return (
    <section>
      <h4>Parameters</h4>
      {parameters.length ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">In</th>
              <th scope="col">Required</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((parameter, index) =>
              '$ref' in parameter ? (
                <tr key={`${parameter.$ref}:${index}`}>
                  <th scope="row" colSpan={4}>
                    Reference: <code>{parameter.$ref}</code>
                  </th>
                </tr>
              ) : (
                <tr key={`${parameter.in}:${parameter.name}:${index}`}>
                  <th scope="row">
                    <code>{parameter.name}</code>
                    {parameter.deprecated ? ' Deprecated' : null}
                  </th>
                  <td>{parameter.in}</td>
                  <td>{parameter.required ? 'Yes' : 'No'}</td>
                  <td>{parameter.description ?? 'No description.'}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : (
        <p>No parameters.</p>
      )}
    </section>
  );
}

function Security({ security }: { security: SecurityRequirementObject[] }) {
  return (
    <section>
      <h4>Security</h4>
      {security.length ? (
        <ul>
          {security.map((requirement, index) => (
            <li key={index}>
              <UnknownValue value={requirement} />
            </li>
          ))}
        </ul>
      ) : (
        <p>No security requirements.</p>
      )}
    </section>
  );
}

function Servers({ servers }: { servers: ServerObject[] }) {
  return (
    <section>
      <h4>Servers</h4>
      {servers.length ? (
        <ul>
          {servers.map((server) => (
            <li key={server.url}>
              <code>{server.url}</code>
              {server.description ? <p>{server.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No operation-specific servers.</p>
      )}
    </section>
  );
}

function UnknownRecordSection({
  title,
  value,
  emptyMessage,
}: {
  title: string;
  value: Record<string, unknown>;
  emptyMessage: string;
}) {
  return (
    <section>
      <h4>{title}</h4>
      {Object.keys(value).length ? (
        <dl>
          {Object.entries(value).map(([key, entry]) => (
            <div key={key}>
              <dt>
                <code>{key}</code>
              </dt>
              <dd>
                <UnknownValue value={entry} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

function UnknownObjectSection({ title, value, emptyMessage }: { title: string; value: unknown; emptyMessage: string }) {
  return (
    <section>
      <h4>{title}</h4>
      {value ? <UnknownValue value={value} /> : <p>{emptyMessage}</p>}
    </section>
  );
}

function UnknownValue({ value }: { value: unknown }) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span>{String(value)}</span>;
  }

  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}

function MethodLabel({ method }: { method: NormalizedOperation['method'] }) {
  return <strong>{method.toUpperCase()}</strong>;
}

function toDomId(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-');
}
