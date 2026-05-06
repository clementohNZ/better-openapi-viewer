import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  buildTryItOutRequest,
  filterOperations,
  generateRequestSnippet,
  getMediaTypeExample,
  getOperations,
  getSecuritySchemes,
  getSchemaTree,
  groupOperationsByTag,
  isSubmitMethodSupported,
  mergeViewerConfig,
  normalizeResponses,
  sortOperations,
  sortOperationTags,
  type BasicAuthCredentials,
  type ExampleObject,
  type ExternalDocumentationObject,
  type HttpMethod,
  type MediaTypeObject,
  type NormalizedOperation,
  type OpenAPIObject,
  type OperationObject,
  type OperationFilter,
  type ParameterObject,
  type PathItemObject,
  type ReferenceObject,
  type RequestBodyObject,
  type SchemaObject,
  type SchemaTreeNode,
  type SerializableParameterValue,
  type SecurityCredential,
  type SecurityRequirementObject,
  type SecuritySchemeObject,
  type ServerObject,
  type TryItOutAuthCredentials,
  type TryItOutRequest,
  type TryItOutRequestSnippetLanguage,
  type ViewerConfig,
} from '@better-openapi-viewer/core';

export type BetterOpenApiViewerProps = {
  document: OpenAPIObject;
  config?: ViewerConfig & { preauthorizedCredentials?: TryItOutAuthCredentials };
  persistAuthorization?: boolean;
  preauthorizedCredentials?: TryItOutAuthCredentials;
};

export function BetterOpenApiViewer({ document, config, persistAuthorization, preauthorizedCredentials }: BetterOpenApiViewerProps) {
  const viewerConfig = useMemo(() => mergeViewerConfig(config, { persistAuthorization }), [config, persistAuthorization]);
  const [query, setQuery] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<HttpMethod[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [authFilter, setAuthFilter] = useState<NonNullable<OperationFilter['auth']>>('any');
  const [deprecatedFilter, setDeprecatedFilter] = useState('any');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [tryItOutEnabled, setTryItOutEnabled] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const operations = useMemo(() => sortOperations(getOperations(document), viewerConfig.operationsSorter), [document, viewerConfig.operationsSorter]);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(() =>
    viewerConfig.defaultExpansion === 'full' ? new Set(operations.map((operation) => operation.id)) : new Set(),
  );
  const securitySchemes = useMemo(() => getSupportedSecuritySchemes(document), [document]);
  const componentSchemas = useMemo(() => getComponentSchemas(document), [document]);
  const [authCredentials, setAuthCredentials] = useState<TryItOutAuthCredentials>(() =>
    mergeCredentials(config?.preauthorizedCredentials, preauthorizedCredentials, viewerConfig.persistAuthorization ? readPersistedAuthCredentials(document) : {}),
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
    () => {
      if (viewerConfig.filter === false) {
        return operations;
      }

      return filterOperations(operations, {
        query,
        methods: selectedMethods,
        tags: selectedTags,
        auth: authFilter,
        deprecated: deprecatedFilter === 'any' ? undefined : deprecatedFilter === 'deprecated',
        contentTypes: selectedContentTypes,
      });
    },
    [authFilter, deprecatedFilter, operations, query, selectedContentTypes, selectedMethods, selectedTags, viewerConfig.filter],
  );
  const groupedOperations = useMemo(
    () => sortOperationTags(groupOperationsByTag(filteredOperations, document.tags), viewerConfig.tagsSorter),
    [document.tags, filteredOperations, viewerConfig.tagsSorter],
  );

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

    if (viewerConfig.persistAuthorization) {
      writePersistedAuthCredentials(document, credentials);
    }
  };

  return (
    <main data-theme={theme}>
      <header>
        {document.info?.version ? <p>{document.info.version}</p> : null}
        <h1>{document.info?.title ?? 'OpenAPI'}</h1>
        {document.info?.description ? <MarkdownText value={document.info.description} /> : null}
        <fieldset aria-label="Viewer theme">
          <legend>Theme</legend>
          <label>
            <input type="radio" name="viewer-theme" checked={theme === 'light'} onChange={() => setTheme('light')} />
            Light theme
          </label>
          <label>
            <input type="radio" name="viewer-theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} />
            Dark theme
          </label>
        </fieldset>
      </header>

      <AuthorizePanel
        credentials={authCredentials}
        onChange={updateAuthCredentials}
        persistAuthorization={viewerConfig.persistAuthorization}
        schemes={securitySchemes}
      />

      <Models schemas={componentSchemas} />

      <section aria-labelledby="endpoint-navigation-heading">
        <h2 id="endpoint-navigation-heading">Endpoints</h2>
        <p>
          Showing {filteredOperations.length} of {operations.length} operations.
        </p>
        {viewerConfig.filter === false ? null : (
          <>
            <label>
              Search endpoints
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={typeof viewerConfig.filter === 'string' ? viewerConfig.filter : 'Method, path, tag, summary, parameter...'}
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
          </>
        )}

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
          <label>
            <input type="checkbox" checked={tryItOutEnabled} onChange={(event) => setTryItOutEnabled(event.currentTarget.checked)} />
            Enable Try It Out
          </label>
        </div>
        {groupedOperations.map(({ name, description, externalDocs, operations: tagOperations }) => (
          <section key={name} aria-labelledby={`tag-${toDomId(name)}`}>
            <h3 id={`tag-${toDomId(name)}`}>
              {name} ({tagOperations.length})
            </h3>
            {description ? <MarkdownText value={description} /> : null}
            {externalDocs ? <ExternalDocsLink docs={externalDocs} /> : null}

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
                          <OperationOverview document={document} operation={operation} />
                          <Parameters parameters={operation.parameters} />
                          <RequestBody requestBody={operation.requestBody} />
                          <Responses operation={operation} document={document} />
                          <Callbacks operation={operation} document={document} />
                          <Security security={operation.security} schemes={securitySchemes} />
                          <Servers servers={operation.servers} />
                          {isSubmitMethodSupported(operation.method, viewerConfig) ? (
                            <TryItOut
                              authCredentials={authCredentials}
                              displayRequestDuration={viewerConfig.displayRequestDuration}
                              globallyEnabled={tryItOutEnabled}
                              operation={operation}
                              document={document}
                            />
                          ) : null}
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

function Models({ schemas }: { schemas: Record<string, unknown> }) {
  const entries = Object.entries(schemas);

  return (
    <section aria-labelledby="models-heading">
      <h2 id="models-heading">Models</h2>
      {entries.length ? (
        <ul>
          {entries.map(([name, schema]) => (
            <li key={name} id={`model-${toDomId(name)}`}>
              <article>
                <h3>{name}</h3>
                <SchemaTree schema={schema} name={name} />
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p>No component schemas documented.</p>
      )}
    </section>
  );
}

function OperationOverview({ document, operation }: { document: OpenAPIObject; operation: NormalizedOperation }) {
  const sourceOperation = getSourceOperation(document, operation);

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
            <dd>
              <MarkdownText value={operation.description} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd>{operation.deprecated ? 'Deprecated' : 'Active'}</dd>
        </div>
        {operation.externalDocs ? (
          <div>
            <dt>External docs</dt>
            <dd>
              <ExternalDocsLink docs={operation.externalDocs} />
            </dd>
          </div>
        ) : null}
        {sourceOperation?.callbacks ? (
          <div>
            <dt>Callbacks</dt>
            <dd>{Object.keys(sourceOperation.callbacks).length}</dd>
          </div>
        ) : null}
        {document.webhooks ? (
          <div>
            <dt>Webhooks</dt>
            <dd>{Object.keys(document.webhooks).length}</dd>
          </div>
        ) : null}
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
                  <td>{parameter.description ? <MarkdownText value={parameter.description} /> : 'No description.'}</td>
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

function RequestBody({ requestBody }: { requestBody: unknown }) {
  if (!requestBody) {
    return (
      <section>
        <h4>Request body</h4>
        <p>No request body.</p>
      </section>
    );
  }

  if (isReferenceObject(requestBody)) {
    return (
      <section>
        <h4>Request body</h4>
        <p>
          Reference: <code>{requestBody.$ref}</code>
        </p>
      </section>
    );
  }

  if (!isRequestBodyObject(requestBody)) {
    return <UnknownObjectSection title="Request body" value={requestBody} emptyMessage="No request body." />;
  }

  const mediaEntries = Object.entries(requestBody.content ?? {});

  return (
    <section>
      <h4>Request body</h4>
      {requestBody.description ? <MarkdownText value={requestBody.description} /> : null}
      <p>{requestBody.required ? 'Required.' : 'Optional.'}</p>
      {mediaEntries.length ? (
        <ul>
          {mediaEntries.map(([contentType, mediaType]) => (
            <li key={contentType}>
              <article>
                <h5>
                  <code>{contentType}</code>
                </h5>
                <MediaTypeDetails mediaType={mediaType} schemaName="body" />
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p>No media types documented.</p>
      )}
    </section>
  );
}

function Responses({ operation, document }: { operation: NormalizedOperation; document: OpenAPIObject }) {
  const responses = normalizeResponses(operation.responses, { produces: getOperationProduces(document, operation) });

  return (
    <section>
      <h4>Responses</h4>
      {responses.length ? (
        <ul>
          {responses.map((response) => (
            <li key={response.statusCode}>
              <article>
                <h5>
                  <code>{response.statusCode}</code> {getResponseStatusLabel(response.statusRange, response.category)}
                </h5>
                {response.description ? <MarkdownText value={response.description} /> : null}
                {response.contentTypes.length ? (
                  <ul>
                    {response.contentTypes.map((contentType) => (
                      <li key={contentType}>
                        <code>{contentType}</code>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {response.schema ? <SchemaTree schema={response.schema} name={`${response.statusCode} response`} /> : null}
                {response.example !== undefined ? (
                  <details>
                    <summary>Example</summary>
                    <UnknownValue value={response.example} />
                  </details>
                ) : null}
                {Object.keys(response.headers).length ? <UnknownRecordSection title="Headers" value={response.headers} emptyMessage="No headers." /> : null}
                {Object.keys(response.links).length ? <UnknownRecordSection title="Links" value={response.links} emptyMessage="No links." /> : null}
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p>No responses documented.</p>
      )}
    </section>
  );
}

function MediaTypeDetails({ mediaType, schemaName }: { mediaType: MediaTypeObject; schemaName: string }) {
  const example = getMediaTypeExample(mediaType);

  return (
    <div>
      {mediaType.schema ? <SchemaTree schema={mediaType.schema} name={schemaName} /> : null}
      {example !== undefined ? (
        <details>
          <summary>Example</summary>
          <UnknownValue value={example} />
        </details>
      ) : null}
      {Object.keys(mediaType.examples ?? {}).length ? <Examples examples={mediaType.examples ?? {}} /> : null}
      {Object.keys(mediaType.encoding ?? {}).length ? <UnknownRecordSection title="Encoding" value={mediaType.encoding ?? {}} emptyMessage="No encoding." /> : null}
    </div>
  );
}

function Examples({ examples }: { examples: Record<string, ExampleObject | ReferenceObject | unknown> }) {
  return (
    <details>
      <summary>Examples</summary>
      <dl>
        {Object.entries(examples).map(([name, example]) => (
          <div key={name}>
            <dt>
              <code>{name}</code>
            </dt>
            <dd>
              <ExampleValue example={example} />
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function ExampleValue({ example }: { example: ExampleObject | ReferenceObject | unknown }) {
  if (isReferenceObject(example)) {
    return <code>{example.$ref}</code>;
  }

  if (isExampleObject(example)) {
    return (
      <div>
        {example.summary ? <p>{example.summary}</p> : null}
        {example.description ? <MarkdownText value={example.description} /> : null}
        {example.externalValue ? <ExternalLink href={example.externalValue}>{example.externalValue}</ExternalLink> : null}
        {example.value !== undefined ? <UnknownValue value={example.value} /> : null}
      </div>
    );
  }

  return <UnknownValue value={example} />;
}

function SchemaTree({ schema, name }: { schema: unknown; name: string }) {
  return <SchemaTreeNodeView node={getSchemaTree(schema, { name })} />;
}

function SchemaTreeNodeView({ node }: { node: SchemaTreeNode }) {
  return (
    <details open={node.kind === 'schema'}>
      <summary>
        <code>{node.name}</code> {node.type ? <span>{node.type}</span> : null}
        {node.format ? <span> ({node.format})</span> : null}
        {node.required ? <strong> required</strong> : null}
        {node.deprecated ? <strong> deprecated</strong> : null}
        {node.readOnly ? <span> readOnly</span> : null}
        {node.writeOnly ? <span> writeOnly</span> : null}
        {node.ref ? (
          <span>
            {' '}
            reference <code>{node.ref}</code>
          </span>
        ) : null}
      </summary>
      {node.description ? <MarkdownText value={node.description} /> : null}
      {node.enumValues?.length ? (
        <p>
          Enum: <code>{node.enumValues.map((value) => JSON.stringify(value)).join(', ')}</code>
        </p>
      ) : null}
      {node.example !== undefined && !node.children.length ? (
        <details>
          <summary>Example</summary>
          <UnknownValue value={node.example} />
        </details>
      ) : null}
      {node.children.length ? (
        <ul>
          {node.children.map((child) => (
            <li key={child.id}>
              <SchemaTreeNodeView node={child} />
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

function Callbacks({ operation, document }: { operation: NormalizedOperation; document: OpenAPIObject }) {
  const sourceOperation = getSourceOperation(document, operation);
  const callbacks = Object.entries(sourceOperation?.callbacks ?? {});
  const webhooks = Object.entries(document.webhooks ?? {});

  if (!callbacks.length && !webhooks.length) {
    return null;
  }

  return (
    <section>
      <h4>Callbacks and webhooks</h4>
      {callbacks.length ? <CallbackSummaryList entries={callbacks} /> : null}
      {webhooks.length ? <PathItemSummaryList title="Webhooks" entries={webhooks} /> : null}
    </section>
  );
}

function CallbackSummaryList({ entries }: { entries: Array<[string, unknown]> }) {
  return (
    <section>
      <h5>Callbacks</h5>
      <ul>
        {entries.map(([name, callback]) => (
          <li key={name}>
            <code>{name}</code>
            {isRecord(callback) ? (
              <ul>
                {Object.entries(callback).map(([expression, pathItem]) => (
                  <li key={expression}>
                    <code>{expression}</code>
                    {isPathItemObject(pathItem) ? <PathItemSummary pathItem={pathItem} /> : <UnknownValue value={pathItem} />}
                  </li>
                ))}
              </ul>
            ) : (
              <UnknownValue value={callback} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PathItemSummaryList({ title, entries }: { title: string; entries: Array<[string, unknown]> }) {
  return (
    <section>
      <h5>{title}</h5>
      <ul>
        {entries.map(([name, value]) => (
          <li key={name}>
            <code>{name}</code>
            {isPathItemObject(value) ? <PathItemSummary pathItem={value} /> : <UnknownValue value={value} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PathItemSummary({ pathItem }: { pathItem: PathItemObject }) {
  const operations = HTTP_METHODS.flatMap((method) => {
    const operation = pathItem[method];
    return operation ? [{ method, operation }] : [];
  });

  return (
    <div>
      {pathItem.summary ? <p>{pathItem.summary}</p> : null}
      {pathItem.description ? <MarkdownText value={pathItem.description} /> : null}
      {operations.length ? (
        <ul>
          {operations.map(({ method, operation }) => (
            <li key={method}>
              <MethodLabel method={method} /> {operation.summary ?? operation.operationId ?? 'Callback operation'}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
  const metadata = getSecuritySchemeMetadata(scheme);

  if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic') {
    const basicCredential = isBasicCredential(credential) ? credential : { username: '', password: '' };

    return (
      <fieldset>
        <legend>
          {name} ({schemeLabel})
        </legend>
        {scheme.description ? <div id={descriptionId}><MarkdownText value={scheme.description} /></div> : null}
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
      {scheme.description ? <span id={descriptionId}><MarkdownText value={scheme.description} /></span> : null}
      {metadata.length ? (
        <dl>
          {metadata.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <UnknownValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
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
  serverVariables: Record<string, string>;
  contentType: string;
  parameters: Record<string, string>;
  bodyText: string;
  bodyFormat: 'json' | 'text';
  multipartFields: Record<string, string>;
  multipartFiles: Record<string, File | undefined>;
  snippetLanguage: SnippetLanguage;
  response?: TryItOutResponse;
  error?: string;
  validationMessages: string[];
  isSending: boolean;
};

type SnippetLanguage = TryItOutRequestSnippetLanguage;

function TryItOut({
  authCredentials,
  displayRequestDuration,
  globallyEnabled,
  operation,
  document,
}: {
  authCredentials: TryItOutAuthCredentials;
  displayRequestDuration: boolean;
  globallyEnabled: boolean;
  operation: NormalizedOperation;
  document: OpenAPIObject;
}) {
  const initialState = useMemo(() => createTryItOutState(operation), [operation]);
  const [state, setState] = useState<TryItOutState>(initialState);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const parameterFields = useMemo(() => operation.parameters.filter((parameter): parameter is ParameterObject => !isReferenceObject(parameter)), [operation.parameters]);
  const request = useMemo(
    () => buildTryItOutRequestForState({ authCredentials, document, operation, state }),
    [authCredentials, document, operation, state.bodyFormat, state.bodyText, state.contentType, state.parameters, state.serverUrl, state.serverVariables],
  );
  const selectedServer = useMemo(() => getServerOptions(operation).find((server) => server.url === state.serverUrl) ?? getServerOptions(operation)[0], [operation, state.serverUrl]);
  const requestBodySchema = getRequestBodyMediaTypes(operation)[state.contentType]?.schema;
  const validationMessages = useMemo(() => validateTryItOutState(operation, state), [operation, state]);

  const updateParameter = (name: string, value: string) => {
    setState((current) => ({ ...current, parameters: { ...current.parameters, [name]: value } }));
  };

  const sendRequest = async () => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const messages = validateTryItOutState(operation, state);
    if (messages.length) {
      setState((current) => ({ ...current, error: undefined, response: undefined, validationMessages: messages }));
      return;
    }

    setState((current) => ({ ...current, error: undefined, isSending: true, response: undefined, validationMessages: [] }));
    const startedAt = performance.now();

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: isMultipartContentType(state.contentType) ? getHeadersWithoutContentType(request.headers) : request.headers,
        body: isMultipartContentType(state.contentType) ? buildMultipartFormData(state) : request.body,
        signal: abortController.signal,
      });
      const body = await response.text();
      const durationMs = Math.round(performance.now() - startedAt);

      if (abortControllerRef.current !== abortController) {
        return;
      }

      abortControllerRef.current = undefined;
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
      if (abortControllerRef.current !== abortController) {
        return;
      }

      abortControllerRef.current = undefined;
      setState((current) => ({
        ...current,
        isSending: false,
        error: error instanceof DOMException && error.name === 'AbortError' ? 'Request canceled.' : error instanceof Error ? error.message : 'Request failed.',
      }));
    }
  };

  const cancelRequest = () => {
    abortControllerRef.current?.abort();
  };

  useEffect(() => {
    if (!globallyEnabled) {
      cancelRequest();
    }
  }, [globallyEnabled]);

  return (
    <section aria-labelledby={`${toDomId(operation.id)}-try-it-out`}>
      <h4 id={`${toDomId(operation.id)}-try-it-out`}>Try It Out</h4>
      {globallyEnabled ? (
        <label>
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(event) => setState((current) => ({ ...current, enabled: event.currentTarget.checked }))}
          />
          Enable request editing
        </label>
      ) : (
        <p>Try It Out is disabled.</p>
      )}
      {globallyEnabled && state.enabled ? (
        <div>
          <fieldset>
            <legend>Request setup</legend>
            <label>
              Server
              <select
                value={state.serverUrl}
                onChange={(event) => {
                  const serverUrl = event.currentTarget.value;
                  const server = getServerOptions(operation).find((option) => option.url === serverUrl);
                  setState((current) => ({ ...current, serverUrl, serverVariables: createInitialServerVariables(server) }));
                }}
              >
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
                        multipartFields: createInitialMultipartFields(operation, contentType),
                        multipartFiles: {},
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
            {selectedServer?.variables ? (
              <fieldset>
                <legend>Server variables</legend>
                {Object.entries(selectedServer.variables).map(([name, variable]) => (
                  <label key={name}>
                    {name}
                    {variable.enum?.length ? (
                      <select
                        value={state.serverVariables[name] ?? String(variable.default ?? '')}
                        onChange={(event) => setState((current) => ({ ...current, serverVariables: { ...current.serverVariables, [name]: event.currentTarget.value } }))}
                      >
                        {variable.enum.map((value) => (
                          <option key={String(value)} value={String(value)}>
                            {String(value)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={state.serverVariables[name] ?? String(variable.default ?? '')}
                        onChange={(event) => setState((current) => ({ ...current, serverVariables: { ...current.serverVariables, [name]: event.currentTarget.value } }))}
                      />
                    )}
                    {variable.description ? <MarkdownText value={variable.description} /> : null}
                  </label>
                ))}
              </fieldset>
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
                  {parameter.description ? <span id={`${toDomId(operation.id)}-${toDomId(parameter.name)}-description`}><MarkdownText value={parameter.description} /></span> : null}
                </label>
              ))
            ) : (
              <p>No editable parameters.</p>
            )}
          </fieldset>

          {state.contentType && isJsonContentType(state.contentType) && isSchemaObject(requestBodySchema) ? (
            <SchemaBodyFields
              schema={requestBodySchema}
              bodyText={state.bodyText}
              onChange={(bodyText) => setState((current) => ({ ...current, bodyText }))}
            />
          ) : null}

          {state.contentType && isMultipartContentType(state.contentType) ? (
            <MultipartBodyFields
              fields={state.multipartFields}
              files={state.multipartFiles}
              onFieldChange={(name, value) => setState((current) => ({ ...current, multipartFields: { ...current.multipartFields, [name]: value } }))}
              onFileChange={(name, file) => setState((current) => ({ ...current, multipartFiles: { ...current.multipartFiles, [name]: file } }))}
              schema={requestBodySchema}
            />
          ) : null}

          {state.contentType && !isMultipartContentType(state.contentType) ? (
            <label>
              Request body
              <textarea
                rows={8}
                value={state.bodyText}
                onChange={(event) => setState((current) => ({ ...current, bodyText: event.currentTarget.value }))}
              />
            </label>
          ) : null}

          <GeneratedRequest
            request={request}
            bodyLabel={isMultipartContentType(state.contentType) ? 'Multipart form data.' : undefined}
            snippetLanguage={state.snippetLanguage}
            onSnippetLanguageChange={(snippetLanguage) => setState((current) => ({ ...current, snippetLanguage }))}
          />
          {validationMessages.length || state.validationMessages.length ? (
            <div role="alert">
              <h5>Validation</h5>
              <ul>
                {(state.validationMessages.length ? state.validationMessages : validationMessages).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <button type="button" onClick={sendRequest} disabled={state.isSending}>
              {state.isSending ? 'Sending...' : 'Send request'}
            </button>
            <button type="button" onClick={cancelRequest} disabled={!state.isSending}>
              Cancel request
            </button>
            <button type="button" onClick={() => setState({ ...createTryItOutState(operation), enabled: true })}>
              Reset inputs
            </button>
          </div>
          <TryItOutResult displayRequestDuration={displayRequestDuration} state={state} />
        </div>
      ) : null}
    </section>
  );
}

function SchemaBodyFields({ bodyText, onChange, schema }: { bodyText: string; onChange: (bodyText: string) => void; schema: SchemaObject }) {
  const bodyValue = parseEditableObject(bodyText);
  const properties = Object.entries(schema.properties ?? {});

  if (!properties.length) {
    return null;
  }

  const updateProperty = (name: string, value: unknown) => {
    onChange(JSON.stringify({ ...bodyValue, [name]: value }, null, 2));
  };

  return (
    <fieldset>
      <legend>JSON body fields</legend>
      {properties.map(([name, property]) => {
        const propertySchema = isSchemaObject(property) ? property : undefined;
        const value = bodyValue[name] ?? propertySchema?.default ?? '';

        return (
          <label key={name}>
            {name}{schema.required?.includes(name) ? ' required' : ''}
            <SchemaInput schema={propertySchema} value={value} onChange={(nextValue) => updateProperty(name, nextValue)} />
            {propertySchema?.description ? <MarkdownText value={propertySchema.description} /> : null}
          </label>
        );
      })}
    </fieldset>
  );
}

function SchemaInput({ onChange, schema, value }: { onChange: (value: unknown) => void; schema?: SchemaObject; value: unknown }) {
  const type = getSchemaInputType(schema);

  if (schema?.enum?.length) {
    return (
      <select value={String(value ?? '')} onChange={(event) => onChange(coerceSchemaValue(event.currentTarget.value, schema))}>
        <option value="">Select value</option>
        {schema.enum.map((item) => (
          <option key={String(item)} value={String(item)}>
            {String(item)}
          </option>
        ))}
      </select>
    );
  }

  if (type === 'boolean') {
    return <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />;
  }

  if (type === 'array' || type === 'object') {
    return <textarea rows={3} value={typeof value === 'string' ? value : JSON.stringify(value ?? (type === 'array' ? [] : {}), null, 2)} onChange={(event) => onChange(parseEditableValue(event.currentTarget.value))} />;
  }

  return (
    <input
      type={type === 'number' || type === 'integer' ? 'number' : schema?.format === 'date' ? 'date' : schema?.format === 'date-time' ? 'datetime-local' : 'text'}
      value={String(value ?? '')}
      onChange={(event) => onChange(coerceSchemaValue(event.currentTarget.value, schema))}
    />
  );
}

function MultipartBodyFields({
  fields,
  files,
  onFieldChange,
  onFileChange,
  schema,
}: {
  fields: Record<string, string>;
  files: Record<string, File | undefined>;
  onFieldChange: (name: string, value: string) => void;
  onFileChange: (name: string, file: File | undefined) => void;
  schema: unknown;
}) {
  const properties = isSchemaObject(schema) ? Object.entries(schema.properties ?? {}) : [];

  return (
    <fieldset>
      <legend>Multipart form data</legend>
      {properties.length ? (
        properties.map(([name, property]) => {
          const propertySchema = isSchemaObject(property) ? property : undefined;
          const isFile = propertySchema?.format === 'binary' || propertySchema?.format === 'base64';

          return (
            <label key={name}>
              {name}
              {isFile ? (
                <input type="file" onChange={(event) => onFileChange(name, event.currentTarget.files?.[0])} />
              ) : (
                <input value={fields[name] ?? ''} onChange={(event) => onFieldChange(name, event.currentTarget.value)} />
              )}
              {files[name] ? <span>{files[name]?.name}</span> : null}
              {propertySchema?.description ? <MarkdownText value={propertySchema.description} /> : null}
            </label>
          );
        })
      ) : (
        <p>No multipart fields documented.</p>
      )}
    </fieldset>
  );
}

function GeneratedRequest({
  bodyLabel,
  onSnippetLanguageChange,
  request,
  snippetLanguage,
}: {
  bodyLabel?: string;
  onSnippetLanguageChange: (language: SnippetLanguage) => void;
  request: TryItOutRequest;
  snippetLanguage: SnippetLanguage;
}) {
  const snippet = generateRequestSnippet(request, snippetLanguage);

  return (
    <section>
      <h5>Generated request</h5>
      <dl>
        <div>
          <dt>URL</dt>
          <dd>
            <code>{request.url}</code>
            <CopyButton label="Copy generated URL" value={request.url} />
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
          <dd>
            {bodyLabel ? (
              bodyLabel
            ) : request.body === undefined ? (
              'No body.'
            ) : (
              <>
                <pre>{request.body}</pre>
                <CopyButton label="Copy generated request body" value={request.body} />
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Snippet</dt>
          <dd>
            <label>
              Snippet language
              <select value={snippetLanguage} onChange={(event) => onSnippetLanguageChange(event.currentTarget.value as SnippetLanguage)}>
                <option value="curl">curl</option>
                <option value="fetch">JavaScript fetch</option>
                <option value="httpie">HTTPie</option>
                <option value="python">Python</option>
              </select>
            </label>
            <pre>{snippet}</pre>
            <CopyButton label={`Copy generated ${snippetLanguage} snippet`} value={snippet} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function TryItOutResult({ displayRequestDuration, state }: { displayRequestDuration: boolean; state: TryItOutState }) {
  if (state.error) {
    return <p role="alert">Request failed: {state.error}</p>;
  }

  if (!state.response) {
    return null;
  }

  const responseText = JSON.stringify(state.response, null, 2);

  return (
    <section aria-live="polite">
      <h5>
        Response <CopyButton label="Copy response" value={responseText} />
      </h5>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>
            {state.response.status} {state.response.statusText}
          </dd>
        </div>
        {displayRequestDuration ? (
          <div>
            <dt>Duration</dt>
            <dd>{state.response.durationMs} ms</dd>
          </div>
        ) : null}
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
            <CopyButton label="Copy response body" value={state.response.body} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={copyValue} aria-label={label}>
      {copied ? 'Copied' : 'Copy'}
    </button>
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

function MarkdownText({ value }: { value: string }) {
  return (
    <>
      {value.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>
          {renderMarkdownInline(paragraph).map((part, partIndex) =>
            part.kind === 'code' ? (
              <code key={partIndex}>{part.value}</code>
            ) : part.kind === 'strong' ? (
              <strong key={partIndex}>{part.value}</strong>
            ) : part.kind === 'em' ? (
              <em key={partIndex}>{part.value}</em>
            ) : part.kind === 'link' ? (
              <ExternalLink key={partIndex} href={part.href}>
                {part.value}
              </ExternalLink>
            ) : (
              <span key={partIndex}>{part.value}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

type MarkdownPart =
  | { kind: 'text' | 'code' | 'strong' | 'em'; value: string }
  | { kind: 'link'; value: string; href: string };

function renderMarkdownInline(value: string): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  const pattern = /(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', value: value.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      parts.push({ kind: 'code', value: match[2] });
    } else if (match[4]) {
      parts.push({ kind: 'strong', value: match[4] });
    } else if (match[6]) {
      parts.push({ kind: 'em', value: match[6] });
    } else if (match[8] && match[9]) {
      parts.push({ kind: 'link', value: match[8], href: match[9] });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push({ kind: 'text', value: value.slice(lastIndex) });
  }

  return parts.length ? parts : [{ kind: 'text', value }];
}

function ExternalDocsLink({ docs }: { docs: ExternalDocumentationObject }) {
  return <ExternalLink href={docs.url}>{docs.description ?? docs.url}</ExternalLink>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
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

const HTTP_METHODS: HttpMethod[] = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function getComponentSchemas(document: OpenAPIObject): Record<string, unknown> {
  const components = isRecord(document.components) && isRecord(document.components.schemas) ? document.components.schemas : {};
  return { ...(document.definitions ?? {}), ...components };
}

function getSourceOperation(document: OpenAPIObject, operation: NormalizedOperation): OperationObject | undefined {
  const pathItem = document.paths?.[operation.path];

  if (!pathItem || isReferenceObject(pathItem)) {
    return undefined;
  }

  return pathItem[operation.method];
}

function getOperationProduces(document: OpenAPIObject, operation: NormalizedOperation): string[] {
  return getSourceOperation(document, operation)?.produces ?? document.produces ?? [];
}

function getResponseStatusLabel(statusRange: string, category: string) {
  const descriptions: Record<string, string> = {
    '1xx': 'Informational',
    '2xx': 'Success',
    '3xx': 'Redirect',
    '4xx': 'Client error',
    '5xx': 'Server error',
    default: 'Default response',
    unknown: 'Unknown status',
  };

  return `${descriptions[statusRange] ?? statusRange} (${category})`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isExampleObject(value: unknown): value is ExampleObject {
  return isRecord(value) && ('value' in value || 'externalValue' in value || 'summary' in value || 'description' in value);
}

function isPathItemObject(value: unknown): value is PathItemObject {
  return isRecord(value) && ('$ref' in value || 'summary' in value || 'description' in value || HTTP_METHODS.some((method) => method in value));
}

function createTryItOutState(operation: NormalizedOperation): TryItOutState {
  const contentType = getRequestBodyContentTypes(operation)[0] ?? '';

  return {
    enabled: false,
    serverUrl: getServerOptions(operation)[0]?.url ?? '',
    serverVariables: createInitialServerVariables(getServerOptions(operation)[0]),
    contentType,
    parameters: Object.fromEntries(
      operation.parameters
        .filter((parameter): parameter is ParameterObject => !isReferenceObject(parameter))
        .map((parameter) => [parameter.name, formatParameterInitialValue(parameter)]),
    ),
    bodyText: formatInitialBody(operation, contentType),
    bodyFormat: isJsonContentType(contentType) ? 'json' : 'text',
    multipartFields: createInitialMultipartFields(operation, contentType),
    multipartFiles: {},
    snippetLanguage: 'curl',
    validationMessages: [],
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
    serverVariables: state.serverVariables,
    parameters: parseParameters(state.parameters),
    body: state.contentType ? (isMultipartContentType(state.contentType) ? state.multipartFields : parseBody(state.bodyText, state.bodyFormat)) : undefined,
    contentType: state.contentType || undefined,
    auth: authCredentials,
    securitySchemes: getTryItOutSecuritySchemes(document),
  });
}

function createInitialServerVariables(server: ServerObject | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(server?.variables ?? {}).map(([name, variable]) => [name, String(variable.default ?? '')]));
}

function createInitialMultipartFields(operation: NormalizedOperation, contentType: string): Record<string, string> {
  const schema = getRequestBodyMediaTypes(operation)[contentType]?.schema;
  if (!isSchemaObject(schema)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(schema.properties ?? {})
      .filter((entry) => isSchemaObject(entry[1]) && entry[1].format !== 'binary' && entry[1].format !== 'base64')
      .map(([name, property]) => [name, formatInitialSchemaValue(property)]),
  );
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

function parseEditableObject(value: string): Record<string, unknown> {
  const parsed = parseBody(value, 'json');
  return isRecord(parsed) ? parsed : {};
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

function formatInitialSchemaValue(schema: SchemaObject | ReferenceObject) {
  if (!isSchemaObject(schema)) {
    return '';
  }

  if (schema.default !== undefined) {
    return String(schema.default);
  }

  if (schema.example !== undefined) {
    return typeof schema.example === 'string' ? schema.example : JSON.stringify(schema.example);
  }

  return '';
}

function validateTryItOutState(operation: NormalizedOperation, state: TryItOutState): string[] {
  const messages: string[] = [];

  for (const parameter of operation.parameters) {
    if (!isReferenceObject(parameter) && parameter.required && !state.parameters[parameter.name]?.trim()) {
      messages.push(`${parameter.in} parameter "${parameter.name}" is required.`);
    }
  }

  if (isRequestBodyObject(operation.requestBody) && operation.requestBody.required && state.contentType) {
    if (isMultipartContentType(state.contentType)) {
      const schema = getRequestBodyMediaTypes(operation)[state.contentType]?.schema;
      if (isSchemaObject(schema)) {
        for (const name of schema.required ?? []) {
          const property = schema.properties?.[name];
          const isFile = isSchemaObject(property) && (property.format === 'binary' || property.format === 'base64');
          if (isFile ? !state.multipartFiles[name] : !state.multipartFields[name]?.trim()) {
            messages.push(`Multipart field "${name}" is required.`);
          }
        }
      }
    } else if (!state.bodyText.trim()) {
      messages.push('Request body is required.');
    }
  }

  if (state.bodyFormat === 'json' && state.bodyText.trim()) {
    try {
      JSON.parse(state.bodyText);
    } catch {
      messages.push('Request body must be valid JSON.');
    }
  }

  return messages;
}

function buildMultipartFormData(state: TryItOutState) {
  const data = new FormData();
  for (const [name, value] of Object.entries(state.multipartFields)) {
    if (value !== '') {
      data.append(name, value);
    }
  }
  for (const [name, file] of Object.entries(state.multipartFiles)) {
    if (file) {
      data.append(name, file);
    }
  }
  return data;
}

function getHeadersWithoutContentType(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'content-type'));
}

function getSchemaInputType(schema: SchemaObject | undefined) {
  const type = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
  return type ?? 'string';
}

function coerceSchemaValue(value: string, schema: SchemaObject | undefined) {
  const type = getSchemaInputType(schema);
  if (value === '') {
    return '';
  }
  if (type === 'integer') {
    return Number.parseInt(value, 10);
  }
  if (type === 'number') {
    return Number.parseFloat(value);
  }
  return value;
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

function getTryItOutSecuritySchemes(document: OpenAPIObject): Record<string, SecuritySchemeObject | ReferenceObject | unknown> {
  return Object.fromEntries(
    Object.entries(getSecuritySchemes(document)).map(([name, scheme]) => [
      name,
      isSecuritySchemeObject(scheme) && (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') ? { ...scheme, type: 'http', scheme: 'bearer' } : scheme,
    ]),
  );
}

function isSupportedSecurityScheme(value: unknown): value is SecuritySchemeObject {
  if (!value || typeof value !== 'object' || isReferenceObject(value) || !('type' in value)) {
    return false;
  }

  const scheme = value as SecuritySchemeObject;
  const httpScheme = scheme.scheme?.toLowerCase();

  return (
    (scheme.type === 'http' && (httpScheme === 'basic' || httpScheme === 'bearer')) ||
    (scheme.type === 'apiKey' && Boolean(scheme.name) && (scheme.in === 'header' || scheme.in === 'query' || scheme.in === 'cookie')) ||
    scheme.type === 'oauth2' ||
    scheme.type === 'openIdConnect'
  );
}

function isSecuritySchemeObject(value: unknown): value is SecuritySchemeObject {
  return value !== null && typeof value === 'object' && !isReferenceObject(value) && 'type' in value;
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

  if (scheme.type === 'oauth2') {
    return 'OAuth 2.0 access token';
  }

  if (scheme.type === 'openIdConnect') {
    return 'OpenID Connect access token';
  }

  return scheme.type;
}

function getSecuritySchemeMetadata(scheme: SecuritySchemeObject): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  if (scheme.openIdConnectUrl) {
    entries.push(['OpenID Connect URL', scheme.openIdConnectUrl]);
  }
  if (scheme.flows) {
    entries.push(['OAuth flows', scheme.flows]);
  }
  return entries;
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

function isSchemaObject(value: unknown): value is SchemaObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !isReferenceObject(value);
}

function isReferenceObject(value: unknown): value is ReferenceObject {
  return value !== null && typeof value === 'object' && '$ref' in value;
}

function isJsonContentType(contentType: string) {
  return contentType.toLowerCase().includes('json');
}

function isMultipartContentType(contentType: string) {
  return contentType.toLowerCase().includes('multipart/form-data');
}

function mergeCredentials(...credentials: Array<TryItOutAuthCredentials | undefined>): TryItOutAuthCredentials {
  return Object.assign({}, ...credentials);
}

function toDomId(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-');
}
