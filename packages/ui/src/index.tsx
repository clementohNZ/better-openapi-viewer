import { useMemo, useState, type ReactNode } from 'react';
import {
  buildTryItOutRequest,
  filterOperations,
  generateCurlSnippet,
  getMediaTypeExample,
  getOperations,
  getSecuritySchemes,
  groupOperationsByTag,
  type BasicAuthCredentials,
  type HttpMethod,
  type MediaTypeObject,
  type NormalizedOperation,
  type OpenAPIObject,
  type OperationFilter,
  type ParameterObject,
  type ReferenceObject,
  type RequestBodyObject,
  type SerializableParameterValue,
  type SecurityCredential,
  type SecurityRequirementObject,
  type SecuritySchemeObject,
  type ServerObject,
  type TryItOutAuthCredentials,
  type TryItOutRequest,
} from '@better-openapi-viewer/core';

export type BetterOpenApiViewerProps = {
  document: OpenAPIObject;
  persistAuthorization?: boolean;
};

export function BetterOpenApiViewer({ document, persistAuthorization = false }: BetterOpenApiViewerProps) {
  const [query, setQuery] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<HttpMethod[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [authFilter, setAuthFilter] = useState<NonNullable<OperationFilter['auth']>>('any');
  const [deprecatedFilter, setDeprecatedFilter] = useState('any');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(() => new Set());
  const operations = useMemo(() => getOperations(document), [document]);
  const securitySchemes = useMemo(() => getSupportedSecuritySchemes(document), [document]);
  const [authCredentials, setAuthCredentials] = useState<TryItOutAuthCredentials>(() =>
    persistAuthorization ? readPersistedAuthCredentials(document) : {},
  );
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
  const updateAuthCredentials = (credentials: TryItOutAuthCredentials) => {
    setAuthCredentials(credentials);

    if (persistAuthorization) {
      writePersistedAuthCredentials(document, credentials);
    }
  };

  return (
    <main>
      <header>
        {document.info?.version ? <p>{document.info.version}</p> : null}
        <h1>{document.info?.title ?? 'OpenAPI'}</h1>
        {document.info?.description ? <p>{document.info.description}</p> : null}
      </header>

      <AuthorizePanel
        credentials={authCredentials}
        onChange={updateAuthCredentials}
        persistAuthorization={persistAuthorization}
        schemes={securitySchemes}
      />

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
                          <Security security={operation.security} schemes={securitySchemes} />
                          <Servers servers={operation.servers} />
                          <TryItOut authCredentials={authCredentials} operation={operation} document={document} />
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

function AuthorizePanel({
  credentials,
  onChange,
  persistAuthorization,
  schemes,
}: {
  credentials: TryItOutAuthCredentials;
  onChange: (credentials: TryItOutAuthCredentials) => void;
  persistAuthorization: boolean;
  schemes: Record<string, SecuritySchemeObject>;
}) {
  const schemeEntries = Object.entries(schemes);
  const credentialCount = Object.values(credentials).filter(Boolean).length;

  const updateCredential = (schemeName: string, credential: SecurityCredential | undefined) => {
    const next = { ...credentials };

    if (isEmptyCredential(credential)) {
      delete next[schemeName];
    } else {
      next[schemeName] = credential;
    }

    onChange(next);
  };

  const clearAll = () => onChange({});

  return (
    <section aria-labelledby="authorize-heading">
      <h2 id="authorize-heading">Authorize</h2>
      {schemeEntries.length ? (
        <details>
          <summary>
            Credentials configured for {credentialCount} of {schemeEntries.length} security schemes
          </summary>
          {persistAuthorization ? <p>Credentials are stored in localStorage for this API document.</p> : null}
          <div role="group" aria-labelledby="authorize-heading">
            {schemeEntries.map(([schemeName, scheme]) => (
              <SecuritySchemeCredentialField
                key={schemeName}
                credential={credentials[schemeName]}
                name={schemeName}
                onChange={(credential) => updateCredential(schemeName, credential)}
                scheme={scheme}
              />
            ))}
          </div>
          <button type="button" onClick={clearAll} disabled={!credentialCount}>
            Clear all credentials
          </button>
        </details>
      ) : (
        <p>No supported security schemes found.</p>
      )}
    </section>
  );
}

function SecuritySchemeCredentialField({
  credential,
  name,
  onChange,
  scheme,
}: {
  credential: SecurityCredential | undefined;
  name: string;
  onChange: (credential: SecurityCredential | undefined) => void;
  scheme: SecuritySchemeObject;
}) {
  const id = `auth-${toDomId(name)}`;
  const descriptionId = scheme.description ? `${id}-description` : undefined;
  const schemeLabel = getSecuritySchemeLabel(scheme);

  if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic') {
    const basicCredential = isBasicCredential(credential) ? credential : { username: '', password: '' };

    return (
      <fieldset>
        <legend>
          {name} ({schemeLabel})
        </legend>
        {scheme.description ? <p id={descriptionId}>{scheme.description}</p> : null}
        <label>
          Username
          <input
            autoComplete="username"
            aria-describedby={descriptionId}
            value={basicCredential.username}
            onChange={(event) => onChange({ ...basicCredential, username: event.currentTarget.value })}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            aria-describedby={descriptionId}
            type="password"
            value={basicCredential.password}
            onChange={(event) => onChange({ ...basicCredential, password: event.currentTarget.value })}
          />
        </label>
        <button type="button" onClick={() => onChange(undefined)} disabled={!credential}>
          Clear {name}
        </button>
      </fieldset>
    );
  }

  return (
    <div>
      <label>
        {name} ({schemeLabel})
        <input
          aria-describedby={descriptionId}
          autoComplete="off"
          type="password"
          value={typeof credential === 'string' ? credential : isValueCredential(credential) ? credential.value : ''}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
      {scheme.description ? <span id={descriptionId}>{scheme.description}</span> : null}
      <button type="button" onClick={() => onChange(undefined)} disabled={!credential}>
        Clear {name}
      </button>
    </div>
  );
}

function Security({ security, schemes }: { security: SecurityRequirementObject[]; schemes: Record<string, SecuritySchemeObject> }) {
  return (
    <section>
      <h4>Security</h4>
      {security.length ? (
        <ul>
          {security.map((requirement, index) => (
            <li key={index}>
              {Object.keys(requirement).length ? (
                <ul>
                  {Object.entries(requirement).map(([schemeName, scopes]) => (
                    <li key={schemeName}>
                      <code>{schemeName}</code>
                      {schemes[schemeName] ? ` (${getSecuritySchemeLabel(schemes[schemeName])})` : null}
                      {scopes.length ? ` scopes: ${scopes.join(', ')}` : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>Anonymous access allowed.</span>
              )}
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

type TryItOutResponse = {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
};

type TryItOutState = {
  enabled: boolean;
  serverUrl: string;
  contentType: string;
  parameters: Record<string, string>;
  bodyText: string;
  bodyFormat: 'json' | 'text';
  response?: TryItOutResponse;
  error?: string;
  isSending: boolean;
};

function TryItOut({
  authCredentials,
  operation,
  document,
}: {
  authCredentials: TryItOutAuthCredentials;
  operation: NormalizedOperation;
  document: OpenAPIObject;
}) {
  const initialState = useMemo(() => createTryItOutState(operation), [operation]);
  const [state, setState] = useState<TryItOutState>(initialState);
  const parameterFields = useMemo(() => operation.parameters.filter((parameter): parameter is ParameterObject => !isReferenceObject(parameter)), [operation.parameters]);
  const request = useMemo(
    () => buildTryItOutRequestForState({ authCredentials, document, operation, state }),
    [authCredentials, document, operation, state.bodyFormat, state.bodyText, state.contentType, state.parameters, state.serverUrl],
  );

  const updateParameter = (name: string, value: string) => {
    setState((current) => ({ ...current, parameters: { ...current.parameters, [name]: value } }));
  };

  const sendRequest = async () => {
    setState((current) => ({ ...current, error: undefined, isSending: true, response: undefined }));
    const startedAt = performance.now();

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      const body = await response.text();
      const durationMs = Math.round(performance.now() - startedAt);

      setState((current) => ({
        ...current,
        isSending: false,
        response: {
          status: response.status,
          statusText: response.statusText,
          durationMs,
          headers: Object.fromEntries(response.headers.entries()),
          body,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isSending: false,
        error: error instanceof Error ? error.message : 'Request failed.',
      }));
    }
  };

  return (
    <section aria-labelledby={`${toDomId(operation.id)}-try-it-out`}>
      <h4 id={`${toDomId(operation.id)}-try-it-out`}>Try It Out</h4>
      <label>
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(event) => setState((current) => ({ ...current, enabled: event.currentTarget.checked }))}
        />
        Enable request editing
      </label>
      {state.enabled ? (
        <div>
          <fieldset>
            <legend>Request setup</legend>
            <label>
              Server
              <select value={state.serverUrl} onChange={(event) => setState((current) => ({ ...current, serverUrl: event.currentTarget.value }))}>
                {getServerOptions(operation).map((server) => (
                  <option key={server.url} value={server.url}>
                    {server.description ? `${server.url} - ${server.description}` : server.url}
                  </option>
                ))}
              </select>
            </label>
            {getRequestBodyContentTypes(operation).length ? (
              <label>
                Content type
                <select
                  value={state.contentType}
                  onChange={(event) =>
                    setState((current) => {
                      const contentType = event.currentTarget.value;
                      return {
                        ...current,
                        contentType,
                        bodyFormat: isJsonContentType(contentType) ? 'json' : 'text',
                        bodyText: formatInitialBody(operation, contentType),
                      };
                    })
                  }
                >
                  {getRequestBodyContentTypes(operation).map((contentType) => (
                    <option key={contentType} value={contentType}>
                      {contentType}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </fieldset>

          <fieldset>
            <legend>Parameters</legend>
            {parameterFields.length ? (
              parameterFields.map((parameter) => (
                <label key={`${parameter.in}:${parameter.name}`}>
                  {parameter.name} ({parameter.in}){parameter.required ? ' required' : ''}
                  <input
                    value={state.parameters[parameter.name] ?? ''}
                    required={parameter.required}
                    onChange={(event) => updateParameter(parameter.name, event.currentTarget.value)}
                    aria-describedby={parameter.description ? `${toDomId(operation.id)}-${toDomId(parameter.name)}-description` : undefined}
                  />
                  {parameter.description ? <span id={`${toDomId(operation.id)}-${toDomId(parameter.name)}-description`}>{parameter.description}</span> : null}
                </label>
              ))
            ) : (
              <p>No editable parameters.</p>
            )}
          </fieldset>

          {state.contentType ? (
            <label>
              Request body
              <textarea
                rows={8}
                value={state.bodyText}
                onChange={(event) => setState((current) => ({ ...current, bodyText: event.currentTarget.value }))}
              />
            </label>
          ) : null}

          <GeneratedRequest request={request} />
          <div>
            <button type="button" onClick={sendRequest} disabled={state.isSending}>
              {state.isSending ? 'Sending...' : 'Send request'}
            </button>
            <button type="button" onClick={() => setState({ ...createTryItOutState(operation), enabled: true })}>
              Reset inputs
            </button>
          </div>
          <TryItOutResult state={state} />
        </div>
      ) : null}
    </section>
  );
}

function GeneratedRequest({ request }: { request: TryItOutRequest }) {
  return (
    <section>
      <h5>Generated request</h5>
      <dl>
        <div>
          <dt>URL</dt>
          <dd>
            <code>{request.url}</code>
          </dd>
        </div>
        <div>
          <dt>Headers</dt>
          <dd>
            <UnknownValue value={request.headers} />
          </dd>
        </div>
        <div>
          <dt>Body</dt>
          <dd>{request.body === undefined ? 'No body.' : <pre>{request.body}</pre>}</dd>
        </div>
        <div>
          <dt>curl</dt>
          <dd>
            <pre>{generateCurlSnippet(request)}</pre>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function TryItOutResult({ state }: { state: TryItOutState }) {
  if (state.error) {
    return <p role="alert">Request failed: {state.error}</p>;
  }

  if (!state.response) {
    return null;
  }

  return (
    <section aria-live="polite">
      <h5>Response</h5>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>
            {state.response.status} {state.response.statusText}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{state.response.durationMs} ms</dd>
        </div>
        <div>
          <dt>Headers</dt>
          <dd>
            <UnknownValue value={state.response.headers} />
          </dd>
        </div>
        <div>
          <dt>Body</dt>
          <dd>
            <pre>{state.response.body}</pre>
          </dd>
        </div>
      </dl>
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

function createTryItOutState(operation: NormalizedOperation): TryItOutState {
  const contentType = getRequestBodyContentTypes(operation)[0] ?? '';

  return {
    enabled: false,
    serverUrl: getServerOptions(operation)[0]?.url ?? '',
    contentType,
    parameters: Object.fromEntries(
      operation.parameters
        .filter((parameter): parameter is ParameterObject => !isReferenceObject(parameter))
        .map((parameter) => [parameter.name, formatParameterInitialValue(parameter)]),
    ),
    bodyText: formatInitialBody(operation, contentType),
    bodyFormat: isJsonContentType(contentType) ? 'json' : 'text',
    isSending: false,
  };
}

function buildTryItOutRequestForState({
  authCredentials,
  document,
  operation,
  state,
}: {
  authCredentials: TryItOutAuthCredentials;
  document: OpenAPIObject;
  operation: NormalizedOperation;
  state: TryItOutState;
}) {
  return buildTryItOutRequest({
    document,
    operation,
    serverUrl: state.serverUrl,
    parameters: parseParameters(state.parameters),
    body: state.contentType ? parseBody(state.bodyText, state.bodyFormat) : undefined,
    contentType: state.contentType || undefined,
    auth: authCredentials,
  });
}

function parseParameters(parameters: Record<string, string>): Record<string, SerializableParameterValue | undefined> {
  return Object.fromEntries(
    Object.entries(parameters).map(([name, value]) => [name, value.trim() ? parseEditableValue(value) : undefined]),
  );
}

function parseEditableValue(value: string): SerializableParameterValue {
  try {
    return JSON.parse(value) as SerializableParameterValue;
  } catch {
    return value;
  }
}

function parseBody(value: string, format: TryItOutState['bodyFormat']): unknown {
  if (!value.trim()) {
    return undefined;
  }

  if (format === 'json') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

function formatParameterInitialValue(parameter: ParameterObject) {
  if ('example' in parameter && parameter.example !== undefined) {
    return typeof parameter.example === 'string' ? parameter.example : JSON.stringify(parameter.example, null, 2);
  }

  return '';
}

function formatInitialBody(operation: NormalizedOperation, contentType: string) {
  const mediaType = getRequestBodyMediaTypes(operation)[contentType];
  const example = getMediaTypeExample(mediaType);

  if (example === undefined) {
    return '';
  }

  return typeof example === 'string' ? example : JSON.stringify(example, null, 2);
}

function getRequestBodyContentTypes(operation: NormalizedOperation) {
  return Object.keys(getRequestBodyMediaTypes(operation));
}

function getRequestBodyMediaTypes(operation: NormalizedOperation): Record<string, MediaTypeObject> {
  const requestBody = operation.requestBody;

  if (!isRequestBodyObject(requestBody) || !requestBody.content) {
    return {};
  }

  return requestBody.content;
}

function getServerOptions(operation: NormalizedOperation) {
  return operation.servers.length ? operation.servers : [{ url: '' }];
}

function getSupportedSecuritySchemes(document: OpenAPIObject): Record<string, SecuritySchemeObject> {
  const schemes = getSecuritySchemes(document);
  const supportedEntries = Object.entries(schemes).filter((entry): entry is [string, SecuritySchemeObject] => isSupportedSecurityScheme(entry[1]));

  return Object.fromEntries(supportedEntries);
}

function isSupportedSecurityScheme(value: unknown): value is SecuritySchemeObject {
  if (!value || typeof value !== 'object' || isReferenceObject(value) || !('type' in value)) {
    return false;
  }

  const scheme = value as SecuritySchemeObject;
  const httpScheme = scheme.scheme?.toLowerCase();

  return (
    (scheme.type === 'http' && (httpScheme === 'basic' || httpScheme === 'bearer')) ||
    (scheme.type === 'apiKey' && Boolean(scheme.name) && (scheme.in === 'header' || scheme.in === 'query' || scheme.in === 'cookie'))
  );
}

function getSecuritySchemeLabel(scheme: SecuritySchemeObject) {
  if (scheme.type === 'http') {
    const httpScheme = scheme.scheme?.toLowerCase();

    if (httpScheme === 'bearer') {
      return scheme.bearerFormat ? `bearer ${scheme.bearerFormat}` : 'bearer';
    }

    return httpScheme ?? 'http';
  }

  if (scheme.type === 'apiKey') {
    return `api key in ${scheme.in}`;
  }

  return scheme.type;
}

function isEmptyCredential(credential: SecurityCredential | undefined) {
  if (!credential) {
    return true;
  }

  if (typeof credential === 'string') {
    return !credential.trim();
  }

  if (isBasicCredential(credential)) {
    return !credential.username.trim() && !credential.password;
  }

  return !credential.value.trim();
}

function isBasicCredential(credential: SecurityCredential | undefined): credential is BasicAuthCredentials {
  return Boolean(credential) && typeof credential === 'object' && 'username' in credential && 'password' in credential;
}

function isValueCredential(credential: SecurityCredential | undefined): credential is { value: string } {
  return Boolean(credential) && typeof credential === 'object' && 'value' in credential;
}

function readPersistedAuthCredentials(document: OpenAPIObject): TryItOutAuthCredentials {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const value = window.localStorage.getItem(getAuthStorageKey(document));
    return value ? (JSON.parse(value) as TryItOutAuthCredentials) : {};
  } catch {
    return {};
  }
}

function writePersistedAuthCredentials(document: OpenAPIObject, credentials: TryItOutAuthCredentials) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storageKey = getAuthStorageKey(document);

    if (Object.values(credentials).some(Boolean)) {
      window.localStorage.setItem(storageKey, JSON.stringify(credentials));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage failures so private browsing or restricted storage cannot block requests.
  }
}

function getAuthStorageKey(document: OpenAPIObject) {
  return `better-openapi-viewer:auth:${document.info?.title ?? 'OpenAPI'}:${document.info?.version ?? ''}`;
}

function isRequestBodyObject(value: unknown): value is RequestBodyObject {
  return Boolean(value) && typeof value === 'object' && !isReferenceObject(value);
}

function isReferenceObject(value: unknown): value is ReferenceObject {
  return value !== null && typeof value === 'object' && '$ref' in value;
}

function isJsonContentType(contentType: string) {
  return contentType.toLowerCase().includes('json');
}

function toDomId(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-');
}
