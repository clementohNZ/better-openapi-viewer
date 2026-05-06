import { useMemo, useState, type ReactNode } from 'react';
import {
  filterOperations,
  getOperations,
  groupOperationsByTag,
  type HttpMethod,
  type NormalizedOperation,
  type OpenAPIObject,
  type OperationFilter,
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
  const [selectedMethods, setSelectedMethods] = useState<HttpMethod[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [authFilter, setAuthFilter] = useState<NonNullable<OperationFilter['auth']>>('any');
  const [deprecatedFilter, setDeprecatedFilter] = useState('any');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(() => new Set());
  const operations = useMemo(() => getOperations(document), [document]);
  const methodOptions = useMemo(() => getCountedOptions(operations, (operation) => [operation.method]), [operations]);
  const tagOptions = useMemo(() => getCountedOptions(operations, (operation) => operation.tags), [operations]);
  const contentTypeOptions = useMemo(() => getCountedOptions(operations, (operation) => operation.contentTypes), [operations]);
  const authCounts = useMemo(
    () => ({
      required: operations.filter((operation) => operation.requiresAuth).length,
      none: operations.filter((operation) => !operation.requiresAuth).length,
    }),
    [operations],
  );
  const deprecatedCounts = useMemo(
    () => ({
      active: operations.filter((operation) => !operation.deprecated).length,
      deprecated: operations.filter((operation) => operation.deprecated).length,
    }),
    [operations],
  );
  const activeFilterCount =
    Number(Boolean(query.trim())) +
    selectedMethods.length +
    selectedTags.length +
    Number(authFilter !== 'any') +
    Number(deprecatedFilter !== 'any') +
    selectedContentTypes.length;
  const filteredOperations = useMemo(
    () =>
      filterOperations(operations, {
        query,
        methods: selectedMethods,
        tags: selectedTags,
        auth: authFilter,
        deprecated: deprecatedFilter === 'any' ? undefined : deprecatedFilter === 'deprecated',
        contentTypes: selectedContentTypes,
      }),
    [authFilter, deprecatedFilter, operations, query, selectedContentTypes, selectedMethods, selectedTags],
  );
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
  const resetFilters = () => {
    setQuery('');
    setSelectedMethods([]);
    setSelectedTags([]);
    setAuthFilter('any');
    setDeprecatedFilter('any');
    setSelectedContentTypes([]);
  };

  return (
    <main>
      <header>
        {document.info?.version ? <p>{document.info.version}</p> : null}
        <h1>{document.info?.title ?? 'OpenAPI'}</h1>
        {document.info?.description ? <p>{document.info.description}</p> : null}
      </header>

      <section aria-labelledby="endpoint-navigation-heading">
        <h2 id="endpoint-navigation-heading">Endpoints</h2>
        <p>
          Showing {filteredOperations.length} of {operations.length} operations.
        </p>
        <label>
          Search endpoints
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Method, path, tag, summary, parameter..."
          />
        </label>
        <FilterFieldset legend="Methods">
          {methodOptions.map(({ value, count }) => (
            <CheckboxFilter
              key={value}
              label={value.toUpperCase()}
              count={count}
              checked={selectedMethods.includes(value as HttpMethod)}
              onChange={() => setSelectedMethods((current) => toggleArrayValue(current, value as HttpMethod))}
            />
          ))}
        </FilterFieldset>
        <FilterFieldset legend="Tags">
          {tagOptions.map(({ value, count }) => (
            <CheckboxFilter
              key={value}
              label={value}
              count={count}
              checked={selectedTags.includes(value)}
              onChange={() => setSelectedTags((current) => toggleArrayValue(current, value))}
            />
          ))}
        </FilterFieldset>
        <FilterFieldset legend="Auth">
          <RadioFilter label="Any auth state" count={operations.length} checked={authFilter === 'any'} onChange={() => setAuthFilter('any')} />
          <RadioFilter
            label="Requires auth"
            count={authCounts.required}
            checked={authFilter === 'required'}
            onChange={() => setAuthFilter('required')}
          />
          <RadioFilter label="No auth" count={authCounts.none} checked={authFilter === 'none'} onChange={() => setAuthFilter('none')} />
        </FilterFieldset>
        <FilterFieldset legend="Status">
          <RadioFilter
            label="Any status"
            count={operations.length}
            checked={deprecatedFilter === 'any'}
            onChange={() => setDeprecatedFilter('any')}
            name="deprecated-filter"
          />
          <RadioFilter
            label="Active"
            count={deprecatedCounts.active}
            checked={deprecatedFilter === 'active'}
            onChange={() => setDeprecatedFilter('active')}
            name="deprecated-filter"
          />
          <RadioFilter
            label="Deprecated"
            count={deprecatedCounts.deprecated}
            checked={deprecatedFilter === 'deprecated'}
            onChange={() => setDeprecatedFilter('deprecated')}
            name="deprecated-filter"
          />
        </FilterFieldset>
        {contentTypeOptions.length ? (
          <FilterFieldset legend="Content types">
            {contentTypeOptions.map(({ value, count }) => (
              <CheckboxFilter
                key={value}
                label={value}
                count={count}
                checked={selectedContentTypes.includes(value)}
                onChange={() => setSelectedContentTypes((current) => toggleArrayValue(current, value))}
              />
            ))}
          </FilterFieldset>
        ) : null}
        {activeFilterCount ? (
          <button type="button" onClick={resetFilters}>
            Reset filters ({activeFilterCount})
          </button>
        ) : null}

        <nav aria-label="Endpoint navigation">
          {groupedOperations.length ? (
            groupedOperations.map(({ name, operations: tagOperations }) => (
              <section key={name} aria-labelledby={`tag-nav-${toDomId(name)}`}>
                <h3 id={`tag-nav-${toDomId(name)}`}>
                  {name} ({tagOperations.length})
                </h3>
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
            <h3 id={`tag-${toDomId(name)}`}>
              {name} ({tagOperations.length})
            </h3>
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

function FilterFieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

function CheckboxFilter({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label} ({count})
    </label>
  );
}

function RadioFilter({
  label,
  count,
  checked,
  onChange,
  name = 'auth-filter',
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  name?: string;
}) {
  return (
    <label>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label} ({count})
    </label>
  );
}

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

function getCountedOptions(operations: NormalizedOperation[], getValues: (operation: NormalizedOperation) => string[]) {
  const counts = new Map<string, number>();

  for (const operation of operations) {
    for (const value of getValues(operation)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

function toggleArrayValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value];
}

function toDomId(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-');
}
