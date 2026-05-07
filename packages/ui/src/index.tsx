import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json as jsonLanguage } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
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
} from '@clem/better-openapi-viewer-core';

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
  const tryItOutEnabled = true;
  const [preferences, updatePreferences] = usePreferences();
  const theme = preferences.theme;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance');
  const showOnboarding = !preferences.onboardingCompleted;
  const openSettings = useCallback((tab: SettingsTab = 'appearance') => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== ',' || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      if (target && target.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      event.preventDefault();
      setSettingsOpen((open) => !open);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const operations = useMemo(() => sortOperations(getOperations(document), viewerConfig.operationsSorter), [document, viewerConfig.operationsSorter]);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(() => operations[0]?.id ?? null);
  const securitySchemes = useMemo(() => getSupportedSecuritySchemes(document), [document]);
  const componentSchemas = useMemo(() => getComponentSchemas(document), [document]);
  const initialPreauthorizedCredentials = useMemo(
    () =>
      mergeCredentials(
        config?.preauthorizedCredentials,
        preauthorizedCredentials,
        viewerConfig.persistAuthorization ? readPersistedAuthCredentials(document) : {},
      ),
    [config?.preauthorizedCredentials, document, preauthorizedCredentials, viewerConfig.persistAuthorization],
  );
  const {
    state: serversState,
    setActive: setActiveServer,
    upsertServer,
    removeServer,
  } = useSavedServers(document, initialPreauthorizedCredentials);
  const activeServer = useMemo(
    () => serversState.servers.find((server) => server.id === serversState.activeId) ?? serversState.servers[0] ?? null,
    [serversState],
  );
  const [cookiesByServer, setCookiesForServer] = useCookieStore(document, serversState.servers);
  const activeServerCookies = activeServer ? cookiesByServer[activeServer.id] ?? [] : [];
  const updateActiveServerCookies = useCallback(
    (updater: (prev: SavedCookie[]) => SavedCookie[]) => {
      if (!activeServer) return;
      setCookiesForServer(activeServer.id, updater);
    },
    [activeServer, setCookiesForServer],
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

  const selectedOperation = useMemo(
    () => (selectedOperationId ? operations.find((op) => op.id === selectedOperationId) ?? null : null),
    [operations, selectedOperationId],
  );
  const closeDrawer = useCallback(() => setSelectedOperationId(null), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.startsWith('#operation-')) {
      const id = hash.slice('#operation-'.length);
      const match = operations.find((op) => toDomId(op.id) === id);
      if (match) setSelectedOperationId(match.id);
    }
  }, [operations]);

  const resetFilters = () => {
    setQuery('');
    setSelectedMethods([]);
    setSelectedTags([]);
    setAuthFilter('any');
    setDeprecatedFilter('any');
    setSelectedContentTypes([]);
  };
  return (
    <main className="bov" data-theme={theme}>
      <div className="bov-shell">
        <aside className="bov-sidebar" aria-label="API navigation and filters">
          <header className="bov-product">
            <button
              type="button"
              className="bov-product-gear"
              aria-label="Open settings"
              title={`Settings (${getSettingsShortcutLabel()})`}
              onClick={() => openSettings('appearance')}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <p className="bov-kicker">API Reference</p>
            <h1>{document.info?.title ?? 'OpenAPI'}</h1>
            <p className="bov-version">v{document.info?.version ?? '—'}</p>
            {document.info?.description ? <div className="bov-description"><MarkdownText value={document.info.description} /></div> : null}
            <dl className="bov-stats" aria-label="Document summary">
              <Metric label="Ops" value={operations.length} />
              <Metric label="Tags" value={tagOptions.length} />
              <Metric label="Models" value={Object.keys(componentSchemas).length} />
            </dl>
          </header>

          <ActiveServerPanel
            servers={serversState.servers}
            activeServerId={serversState.activeId}
            onSetActive={setActiveServer}
            onOpenServerSettings={() => openSettings('servers')}
            schemeCount={Object.keys(securitySchemes).length}
          />

          {viewerConfig.filter === false ? null : (
            <section className="bov-panel" aria-labelledby="endpoint-navigation-heading">
              <div className="bov-section-heading">
                <h2 id="endpoint-navigation-heading">Filters</h2>
                <span>{filteredOperations.length}/{operations.length}</span>
              </div>
              <label className="bov-search bov-search-sidebar">
                <span className="sr-only">Search endpoints</span>
                <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder={typeof viewerConfig.filter === 'string' ? viewerConfig.filter : 'Search method, path, tag…'}
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
                <button className="bov-button bov-button-quiet" type="button" onClick={resetFilters}>
                  Reset filters ({activeFilterCount})
                </button>
              ) : null}
            </section>
          )}

          <Models schemas={componentSchemas} />

        </aside>

        <section className="bov-content" aria-labelledby="operations-heading">
          <header className="bov-content-header">
            <div className="bov-content-header-text">
              <p className="bov-kicker">Workspace</p>
              <h2 id="operations-heading">Operations</h2>
            </div>
            <p className="bov-muted bov-content-count">
              {filteredOperations.length} of {operations.length} {operations.length === 1 ? 'endpoint' : 'endpoints'}
            </p>
          </header>

          {groupedOperations.length ? (
            <div className="bov-operation-groups">
              {groupedOperations.map(({ name, description, externalDocs, operations: tagOperations }) => (
                <section className="bov-tag-group" key={name} aria-labelledby={`tag-${toDomId(name)}`}>
                  <div className="bov-tag-header">
                    <div className="bov-tag-title">
                      <h3 id={`tag-${toDomId(name)}`}>{name}</h3>
                      <span className="bov-tag-count">{tagOperations.length}</span>
                    </div>
                    {description ? <div className="bov-muted bov-tag-desc"><MarkdownText value={description} /></div> : null}
                    {externalDocs ? <ExternalDocsLink docs={externalDocs} /> : null}
                  </div>

                  <ul className="bov-operation-list" role="list">
                    {tagOperations.map((operation, index) => {
                      const isActive = selectedOperationId === operation.id;
                      return (
                        <li className="bov-operation-row" key={`${name}:${operation.id}`} id={`operation-${toDomId(operation.id)}`} style={{ '--index': index } as CssVars}>
                          <button
                            className="bov-row-trigger"
                            type="button"
                            data-active={isActive ? 'true' : 'false'}
                            aria-pressed={isActive}
                            onClick={() => setSelectedOperationId(operation.id)}
                          >
                            <MethodLabel method={operation.method} />
                            <code className="bov-row-path">{operation.path}</code>
                            <span className="bov-row-summary">
                              {operation.summary ?? <span className="bov-faint-text">—</span>}
                            </span>
                            {operation.deprecated ? <span className="bov-pill bov-pill-warn">deprecated</span> : null}
                            {operation.requiresAuth ? <span className="bov-pill" title="Requires auth" aria-label="Requires auth">●</span> : null}
                            <span className="bov-row-arrow" aria-hidden="true">→</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing matches these filters" body="Clear a filter or search for a method, route, tag, operation id, parameter, or schema name." />
          )}
        </section>
        <OperationDetailPanel
          operation={selectedOperation}
          document={document}
          servers={serversState.servers}
          activeServer={activeServer}
          activeServerCookies={activeServerCookies}
          onSetActiveServer={setActiveServer}
          onCookiesChange={updateActiveServerCookies}
          onOpenSettings={openSettings}
          tryItOutEnabled={tryItOutEnabled}
          viewerConfig={viewerConfig}
          securitySchemes={securitySchemes}
          onClose={closeDrawer}
        />
      </div>
      {showOnboarding ? (
        <OnboardingModal
          preferences={preferences}
          onComplete={(patch) => updatePreferences({ ...patch, onboardingCompleted: true })}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsModal
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          preferences={preferences}
          onChangePreferences={updatePreferences}
          onClose={() => setSettingsOpen(false)}
          serversState={serversState}
          onSetActiveServer={setActiveServer}
          onUpsertServer={upsertServer}
          onRemoveServer={removeServer}
          cookiesByServer={cookiesByServer}
          onSetCookiesForServer={setCookiesForServer}
          schemes={securitySchemes}
        />
      ) : null}
    </main>
  );
}

function OperationDetailPanel({
  operation,
  document,
  servers,
  activeServer,
  activeServerCookies,
  onSetActiveServer,
  onCookiesChange,
  onOpenSettings,
  tryItOutEnabled,
  viewerConfig,
  securitySchemes,
  onClose,
}: {
  operation: NormalizedOperation | null;
  document: OpenAPIObject;
  servers: SavedServer[];
  activeServer: SavedServer | null;
  activeServerCookies: SavedCookie[];
  onSetActiveServer: (id: string) => void;
  onCookiesChange: (updater: (prev: SavedCookie[]) => SavedCookie[]) => void;
  onOpenSettings: (tab?: SettingsTab) => void;
  tryItOutEnabled: boolean;
  viewerConfig: ViewerConfig;
  securitySchemes: Record<string, SecuritySchemeObject>;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'docs' | 'try'>('docs');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setTab('docs');
  }, [operation?.id]);

  if (!operation) {
    return (
      <aside className="bov-detail" aria-label="Endpoint details">
        <div className="bov-detail-empty">
          <div className="bov-detail-empty-mark" aria-hidden="true">{'{ }'}</div>
          <h3>No endpoint selected</h3>
          <p>Pick an endpoint from the list to view its parameters, request, response and try it out.</p>
        </div>
      </aside>
    );
  }

  const canTry = isSubmitMethodSupported(operation.method, viewerConfig);

  return (
    <aside className="bov-detail" aria-label={`${operation.method.toUpperCase()} ${operation.path}`}>
      <header className="bov-detail-header">
        <div className="bov-detail-title">
          <div className="bov-detail-line">
            <MethodLabel method={operation.method} />
            <code className="bov-detail-path">{operation.path}</code>
          </div>
          <p className="bov-detail-summary">
            {operation.summary ?? <span className="bov-faint-text">No summary documented</span>}
            {operation.deprecated ? <span className="bov-pill bov-pill-warn">deprecated</span> : null}
          </p>
        </div>
        <button className="bov-detail-close" type="button" onClick={onClose} aria-label="Clear selection" title="Clear selection">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {canTry ? (
        <div className="bov-detail-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'docs'} className="bov-tab" data-active={tab === 'docs'} onClick={() => setTab('docs')}>
            Reference
          </button>
          <button role="tab" aria-selected={tab === 'try'} className="bov-tab" data-active={tab === 'try'} onClick={() => setTab('try')}>
            Try it out
          </button>
        </div>
      ) : null}

      <div className="bov-detail-body" ref={scrollRef}>
        {tab === 'docs' || !canTry ? (
          <div className="bov-detail-stack">
            <OperationOverview document={document} operation={operation} />
            <Parameters parameters={operation.parameters} />
            <RequestBody requestBody={operation.requestBody} />
            <Responses operation={operation} document={document} />
            <Callbacks operation={operation} document={document} />
            <Security security={operation.security} schemes={securitySchemes} />
            <Servers servers={operation.servers} />
          </div>
        ) : (
          <div className="bov-detail-stack">
            <TryItOut
              servers={servers}
              activeServer={activeServer}
              activeServerCookies={activeServerCookies}
              onSetActiveServer={onSetActiveServer}
              onCookiesChange={onCookiesChange}
              onOpenSettings={onOpenSettings}
              displayRequestDuration={Boolean(viewerConfig.displayRequestDuration)}
              globallyEnabled={tryItOutEnabled}
              operation={operation}
              document={document}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

export type { OpenAPIObject };

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="bov-empty">
      <span aria-hidden="true" />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function FilterFieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="bov-filter-group">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

function CheckboxFilter({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="bov-filter-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
      <small>{count}</small>
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
    <label className="bov-filter-option">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
      <small>{count}</small>
    </label>
  );
}

function Models({ schemas }: { schemas: Record<string, unknown> }) {
  const entries = Object.entries(schemas);

  return (
    <section className="bov-panel bov-models" aria-labelledby="models-heading">
      <div className="bov-section-heading">
        <h2 id="models-heading">Models</h2>
        <span>{entries.length}</span>
      </div>
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
        <p className="bov-muted">No component schemas documented.</p>
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

function SchemaTreeNodeView({ node, depth = 0 }: { node: SchemaTreeNode; depth?: number }) {
  const hasChildren = node.children.length > 0;
  const hasExample = node.example !== undefined && !hasChildren;
  const inlineExample = hasExample && isPrimitiveValue(node.example);

  const head = (
    <>
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
      {inlineExample ? (
        <span className="bov-schema-example-inline">
          <span aria-hidden="true"> · </span>
          <code>{JSON.stringify(node.example)}</code>
        </span>
      ) : null}
    </>
  );

  const body = (
    <>
      {node.description ? <MarkdownText value={node.description} /> : null}
      {node.enumValues?.length ? (
        <p>
          Enum: <code>{node.enumValues.map((value) => JSON.stringify(value)).join(', ')}</code>
        </p>
      ) : null}
      {hasExample && !inlineExample ? (
        <div className="bov-schema-example-block">
          <span className="bov-schema-example-label">Example</span>
          <UnknownValue value={node.example} />
        </div>
      ) : null}
      {hasChildren ? (
        <ul>
          {node.children.map((child) => (
            <li key={child.id}>
              <SchemaTreeNodeView node={child} depth={depth + 1} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  if (!hasChildren) {
    return (
      <div className="bov-schema-leaf">
        <div className="bov-schema-leaf-head">{head}</div>
        {body}
      </div>
    );
  }

  return (
    <details open={depth < 2}>
      <summary>{head}</summary>
      {body}
    </details>
  );
}

function isPrimitiveValue(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
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

function ActiveServerPanel({
  servers,
  activeServerId,
  onSetActive,
  onOpenServerSettings,
  schemeCount,
}: {
  servers: SavedServer[];
  activeServerId: string | null;
  onSetActive: (id: string) => void;
  onOpenServerSettings: () => void;
  schemeCount: number;
}) {
  const active = servers.find((server) => server.id === activeServerId) ?? servers[0] ?? null;
  const credentialCount = active ? Object.values(active.credentials).filter(Boolean).length : 0;

  return (
    <section className="bov-panel bov-active-server" aria-labelledby="active-server-heading">
      <div className="bov-section-heading">
        <h2 id="active-server-heading">Server</h2>
        <span>
          {credentialCount}/{schemeCount} auth
        </span>
      </div>
      {servers.length ? (
        <>
          <div className="bov-select-wrap">
            <select
              className="bov-active-server-select"
              value={active?.id ?? ''}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (value === '__manage__') {
                  onOpenServerSettings();
                  return;
                }
                onSetActive(value);
              }}
              aria-label="Active server"
            >
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.label}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__manage__">Manage servers & credentials…</option>
            </select>
          </div>
          {active ? (
            <p className="bov-muted bov-active-server-url">
              <code>{active.url || '(relative URL)'}</code>
            </p>
          ) : null}
        </>
      ) : (
        <button type="button" className="bov-button bov-button-quiet" onClick={onOpenServerSettings}>
          Add a server
        </button>
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
        <button className="bov-button bov-button-quiet" type="button" onClick={() => onChange(undefined)} disabled={!credential}>
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
      <button className="bov-button bov-button-quiet" type="button" onClick={() => onChange(undefined)} disabled={!credential}>
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
  servers,
  activeServer,
  activeServerCookies,
  onSetActiveServer,
  onCookiesChange,
  onOpenSettings,
  displayRequestDuration,
  globallyEnabled,
  operation,
  document,
}: {
  servers: SavedServer[];
  activeServer: SavedServer | null;
  activeServerCookies: SavedCookie[];
  onSetActiveServer: (id: string) => void;
  onCookiesChange: (updater: (prev: SavedCookie[]) => SavedCookie[]) => void;
  onOpenSettings: (tab?: SettingsTab) => void;
  displayRequestDuration: boolean;
  globallyEnabled: boolean;
  operation: NormalizedOperation;
  document: OpenAPIObject;
}) {
  const initialState = useMemo(() => createTryItOutState(operation, activeServer), [operation, activeServer?.id]);
  const [state, setState] = useState<TryItOutState>(initialState);

  useEffect(() => {
    setState((current) => ({
      ...current,
      serverUrl: activeServer?.url ?? '',
      serverVariables: activeServer?.variables ?? {},
    }));
  }, [activeServer?.id, activeServer?.url, activeServer?.variables]);

  const authCredentials = activeServer?.credentials ?? {};
  const cookieHeader = useMemo(() => formatCookieHeader(activeServerCookies), [activeServerCookies]);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const parameterFields = useMemo(() => operation.parameters.filter((parameter): parameter is ParameterObject => !isReferenceObject(parameter)), [operation.parameters]);
  const request = useMemo(
    () => buildTryItOutRequestForState({ authCredentials, cookieHeader, document, operation, state }),
    [authCredentials, cookieHeader, document, operation, state.bodyFormat, state.bodyText, state.contentType, state.parameters, state.serverUrl, state.serverVariables],
  );
  const requestBodySchema = getRequestBodyMediaTypes(operation)[state.contentType]?.schema;
  const validationMessages = useMemo(() => validateTryItOutState(operation, state), [operation, state]);
  const requestOrigin = useMemo(() => getRequestOrigin(request.url), [request.url]);

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
        credentials: 'omit',
      });
      const body = await response.text();
      const durationMs = Math.round(performance.now() - startedAt);

      if (abortControllerRef.current !== abortController) {
        return;
      }

      abortControllerRef.current = undefined;

      const setCookies = getSetCookieHeaders(response.headers);
      if (setCookies.length) {
        const parsed = setCookies.map(parseSetCookieHeader).filter((value): value is ParsedSetCookie => Boolean(value));
        if (parsed.length) {
          onCookiesChange((prev) => parsed.reduce(mergeSetCookieIntoJar, prev));
        }
      }

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
    <section aria-labelledby={`${toDomId(operation.id)}-try-it-out`} className="bov-try">
      {globallyEnabled ? (
        <div className="bov-try-stack">
          <fieldset>
            <legend>Request setup</legend>
            <label>
              Server
              <select
                value={activeServer?.id ?? ''}
                onChange={(event) => onSetActiveServer(event.currentTarget.value)}
              >
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.label}{server.url ? ` — ${server.url}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="bov-pref-help">
              Manage servers, variables, and credentials in{' '}
              <button type="button" className="bov-link-button" onClick={() => onOpenSettings('servers')}>
                Settings → Servers
              </button>
              .
            </p>
            {operation.servers.length ? (
              <p className="bov-pref-help">
                This operation defines its own servers in the spec ({operation.servers.map((s) => s.url).join(', ')}). Try-it-out uses the active server above.
              </p>
            ) : null}
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
          </fieldset>

          <ActiveCookiesPanel
            cookies={activeServerCookies}
            origin={requestOrigin}
            serverLabel={activeServer?.label ?? ''}
            onChange={onCookiesChange}
            onOpenSettings={() => onOpenSettings('cookies')}
          />

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
            <RequestBodyEditor
              bodyText={state.bodyText}
              isJson={state.bodyFormat === 'json'}
              onChange={(bodyText) => setState((current) => ({ ...current, bodyText }))}
            />
          ) : null}

          <GeneratedRequest
            request={request}
            bodyLabel={isMultipartContentType(state.contentType) ? 'Multipart form data.' : undefined}
            snippetLanguage={state.snippetLanguage}
            onSnippetLanguageChange={(snippetLanguage) => setState((current) => ({ ...current, snippetLanguage }))}
          />
          {validationMessages.length || state.validationMessages.length ? (
            <div className="bov-try-validation" role="alert">
              <h5>Validation</h5>
              <ul>
                {(state.validationMessages.length ? state.validationMessages : validationMessages).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="bov-try-actions">
            <button className="bov-button bov-button-primary" type="button" onClick={sendRequest} disabled={state.isSending}>
              {state.isSending ? 'Sending...' : 'Send request'}
            </button>
            <button className="bov-button" type="button" onClick={cancelRequest} disabled={!state.isSending}>
              Cancel request
            </button>
            <button className="bov-button bov-button-quiet" type="button" onClick={() => setState({ ...createTryItOutState(operation, activeServer), enabled: true })}>
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

function RequestBodyEditor({
  bodyText,
  isJson,
  onChange,
}: {
  bodyText: string;
  isJson: boolean;
  onChange: (bodyText: string) => void;
}) {
  const parseError = useMemo(() => {
    if (!isJson || !bodyText.trim()) return null;
    try {
      JSON.parse(bodyText);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid JSON.';
    }
  }, [bodyText, isJson]);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(bodyText);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore — error is already shown
    }
  };

  return (
    <fieldset className="bov-try-body">
      <legend>Request body</legend>
      <div className="bov-try-body-toolbar">
        {isJson ? (
          <button
            type="button"
            className="bov-button bov-button-quiet"
            onClick={formatJson}
            disabled={!bodyText.trim() || Boolean(parseError)}
            title="Format JSON (2-space indent)"
          >
            Format
          </button>
        ) : null}
      </div>
      {isJson ? (
        <JsonEditor value={bodyText} onChange={onChange} />
      ) : (
        <textarea
          className="bov-try-body-textarea"
          rows={8}
          value={bodyText}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
      {parseError ? <p className="bov-try-body-error">JSON parse error: {parseError}</p> : null}
    </fieldset>
  );
}

function JsonEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          jsonLanguage(),
          jsonLinter(),
          lintGutter(),
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { fontSize: '12px', backgroundColor: 'transparent' },
            '.cm-content': { fontFamily: "var(--bov-font-mono)", padding: '8px 0' },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              borderRight: '1px solid var(--bov-line)',
              color: 'var(--bov-faint)',
            },
            '&.cm-focused': { outline: 'none' },
            '.cm-activeLine': { backgroundColor: 'transparent' },
            '.cm-activeLineGutter': { backgroundColor: 'transparent' },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            blur: (_event, blurredView) => {
              const text = blurredView.state.doc.toString();
              if (!text.trim()) return false;
              try {
                const formatted = JSON.stringify(JSON.parse(text), null, 2);
                if (formatted !== text) {
                  onChangeRef.current(formatted);
                }
              } catch {
                // leave invalid JSON as-is so the user can fix it
              }
              return false;
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={containerRef} className="bov-json-editor" />;
}

function jsonLinter() {
  return linter((view) => {
    const text = view.state.doc.toString();
    if (!text.trim()) return [];
    try {
      JSON.parse(text);
      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      const match = /position\s+(\d+)/.exec(message);
      const pos = match ? Math.min(Number(match[1]), text.length) : 0;
      return [
        {
          from: pos,
          to: Math.min(pos + 1, text.length),
          severity: 'error' as const,
          message,
        },
      ];
    }
  });
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
  const headersText = JSON.stringify(request.headers, null, 2);

  return (
    <section>
      <h5>Generated request</h5>
      <dl>
        <div>
          <dt>URL</dt>
          <dd>
            <CopyableContent value={request.url} label="Copy generated URL" inline>
              <code>{request.url}</code>
            </CopyableContent>
          </dd>
        </div>
        <div>
          <dt>Headers</dt>
          <dd>
            <CopyableContent value={headersText} label="Copy generated headers">
              <UnknownValue value={request.headers} />
            </CopyableContent>
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
              <CopyableContent value={request.body} label="Copy generated request body">
                <pre>{request.body}</pre>
              </CopyableContent>
            )}
          </dd>
        </div>
        <div>
          <dt>Snippet</dt>
          <dd>
            <div className="bov-generated-snippet">
              <label>
                Snippet language
                <select value={snippetLanguage} onChange={(event) => onSnippetLanguageChange(event.currentTarget.value as SnippetLanguage)}>
                  <option value="curl">curl</option>
                  <option value="fetch">JavaScript fetch</option>
                  <option value="httpie">HTTPie</option>
                  <option value="python">Python</option>
                </select>
              </label>
              <CopyableContent value={snippet} label={`Copy generated ${snippetLanguage} snippet`}>
                <pre>{snippet}</pre>
              </CopyableContent>
            </div>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function CopyableContent({ children, inline, label, value }: { children: ReactNode; inline?: boolean; label: string; value: string }) {
  return (
    <div className={inline ? 'bov-copyable bov-copyable-inline' : 'bov-copyable'}>
      {children}
      <CopyButton label={label} value={value} />
    </div>
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
            <CopyableContent value={state.response.body} label="Copy response body">
              <JsonHighlight value={state.response.body} />
            </CopyableContent>
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
    <button className="bov-copy-button" type="button" onClick={copyValue} aria-label={label}>
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

  return <JsonHighlight value={value} />;
}

function JsonHighlight({ value }: { value: unknown }) {
  let formatted: string | null = null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      try {
        formatted = JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        formatted = null;
      }
    }
  } else if (value !== undefined) {
    try {
      formatted = JSON.stringify(value, null, 2);
    } catch {
      formatted = null;
    }
  }

  if (formatted === null) {
    return <pre>{typeof value === 'string' ? value : String(value ?? '')}</pre>;
  }

  return <pre className="bov-json">{tokenizeJson(formatted)}</pre>;
}

const JSON_TOKEN_RE = /"(?:\\.|[^"\\])*"(\s*:)?|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[{}[\],]/g;

function tokenizeJson(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  JSON_TOKEN_RE.lastIndex = 0;
  while ((match = JSON_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('"') && match[1]) {
      const stringPart = token.slice(0, token.length - match[1].length);
      nodes.push(
        <span key={key++} className="bov-json-key">
          {stringPart}
        </span>,
      );
      nodes.push(
        <span key={key++} className="bov-json-punct">
          {match[1]}
        </span>,
      );
    } else if (token.startsWith('"')) {
      nodes.push(
        <span key={key++} className="bov-json-string">
          {token}
        </span>,
      );
    } else if (token === 'true' || token === 'false') {
      nodes.push(
        <span key={key++} className="bov-json-bool">
          {token}
        </span>,
      );
    } else if (token === 'null') {
      nodes.push(
        <span key={key++} className="bov-json-null">
          {token}
        </span>,
      );
    } else if (/^-?\d/.test(token)) {
      nodes.push(
        <span key={key++} className="bov-json-number">
          {token}
        </span>,
      );
    } else {
      nodes.push(
        <span key={key++} className="bov-json-punct">
          {token}
        </span>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
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
  return <strong className={getMethodClassName(method)}>{method.toUpperCase()}</strong>;
}

function getMethodClassName(method: NormalizedOperation['method']) {
  const base = 'bov-method';
  const variants: Record<string, string> = {
    get: 'bov-method-get',
    post: 'bov-method-post',
    put: 'bov-method-put',
    patch: 'bov-method-patch',
    delete: 'bov-method-delete',
    options: 'bov-method-options',
    head: 'bov-method-head',
    trace: 'bov-method-trace',
  };

  return `${base} ${variants[method] ?? 'bov-method-default'}`;
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

function createTryItOutState(operation: NormalizedOperation, activeServer: SavedServer | null): TryItOutState {
  const contentType = getRequestBodyContentTypes(operation)[0] ?? '';

  return {
    enabled: true,
    serverUrl: activeServer?.url ?? getServerOptions(operation)[0]?.url ?? '',
    serverVariables: activeServer?.variables ?? createInitialServerVariables(getServerOptions(operation)[0]),
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
  cookieHeader,
  document,
  operation,
  state,
}: {
  authCredentials: TryItOutAuthCredentials;
  cookieHeader?: string;
  document: OpenAPIObject;
  operation: NormalizedOperation;
  state: TryItOutState;
}) {
  const built = buildTryItOutRequest({
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

  if (cookieHeader) {
    const existing = built.headers.Cookie ?? built.headers.cookie;
    return {
      ...built,
      headers: {
        ...built.headers,
        Cookie: existing ? `${existing}; ${cookieHeader}` : cookieHeader,
      },
    };
  }

  return built;
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

type EnvScope = 'per-spec' | 'global';

type Preferences = {
  theme: 'light' | 'dark';
  envScope: EnvScope;
  onboardingCompleted: boolean;
};

const PREFS_STORAGE_KEY = 'better-openapi-viewer:prefs';

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  envScope: 'per-spec',
  onboardingCompleted: false,
};

function readPersistedPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePersistedPreferences(prefs: Preferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors (private mode, quota)
  }
}

function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const [prefs, setPrefs] = useState<Preferences>(() => readPersistedPreferences());
  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      writePersistedPreferences(next);
      return next;
    });
  }, []);
  return [prefs, update];
}

function ModalShell({
  children,
  labelledBy,
  onClose,
  dismissible = true,
  className,
}: {
  children: ReactNode;
  labelledBy: string;
  onClose?: () => void;
  dismissible?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!dismissible || !onClose) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dismissible, onClose]);

  return (
    <div className="bov-modal-overlay" role="presentation" onClick={dismissible ? onClose : undefined}>
      <div
        className={className ? `bov-modal ${className}` : 'bov-modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

type SettingsTab = 'appearance' | 'servers' | 'cookies';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'servers', label: 'Servers' },
  { id: 'cookies', label: 'Cookies' },
];

function SettingsModal({
  activeTab,
  onTabChange,
  preferences,
  onChangePreferences,
  onClose,
  serversState,
  onSetActiveServer,
  onUpsertServer,
  onRemoveServer,
  cookiesByServer,
  onSetCookiesForServer,
  schemes,
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  preferences: Preferences;
  onChangePreferences: (patch: Partial<Preferences>) => void;
  onClose: () => void;
  serversState: SavedServersState;
  onSetActiveServer: (id: string) => void;
  onUpsertServer: (server: SavedServer) => void;
  onRemoveServer: (id: string) => void;
  cookiesByServer: Record<string, SavedCookie[]>;
  onSetCookiesForServer: (serverId: string, updater: (prev: SavedCookie[]) => SavedCookie[]) => void;
  schemes: Record<string, SecuritySchemeObject>;
}) {
  return (
    <ModalShell labelledBy="bov-settings-title" onClose={onClose} className="bov-modal-wide">
      <div className="bov-settings-shell">
        <aside className="bov-settings-sidebar" aria-label="Settings sections">
          <div className="bov-settings-sidebar-header">
            <p className="bov-kicker">Preferences</p>
            <h2 id="bov-settings-title">Settings</h2>
          </div>
          <nav>
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="bov-settings-tab"
                data-active={activeTab === tab.id ? 'true' : 'false'}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="bov-settings-main">
          <header className="bov-settings-main-header">
            <h3>{SETTINGS_TABS.find((t) => t.id === activeTab)?.label}</h3>
            <button type="button" className="bov-detail-close" onClick={onClose} aria-label="Close settings">
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className="bov-settings-main-body">
            {activeTab === 'appearance' ? (
              <AppearanceTab preferences={preferences} onChange={onChangePreferences} />
            ) : activeTab === 'servers' ? (
              <ServersTab
                serversState={serversState}
                schemes={schemes}
                onSetActive={onSetActiveServer}
                onUpsertServer={onUpsertServer}
                onRemoveServer={onRemoveServer}
              />
            ) : (
              <CookiesTab
                serversState={serversState}
                cookiesByServer={cookiesByServer}
                onSetCookiesForServer={onSetCookiesForServer}
              />
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function AppearanceTab({
  preferences,
  onChange,
}: {
  preferences: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
}) {
  return (
    <div className="bov-settings-section">
      <fieldset className="bov-pref-group">
        <legend>Theme</legend>
        <div className="bov-segmented">
          <label>
            <input
              type="radio"
              name="bov-pref-theme"
              checked={preferences.theme === 'light'}
              onChange={() => onChange({ theme: 'light' })}
            />
            <span>Light</span>
          </label>
          <label>
            <input
              type="radio"
              name="bov-pref-theme"
              checked={preferences.theme === 'dark'}
              onChange={() => onChange({ theme: 'dark' })}
            />
            <span>Dark</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="bov-pref-group">
        <legend>Environment scope</legend>
        <p className="bov-pref-help">Where saved servers, variables, and Try-it-out values are kept.</p>
        <div className="bov-segmented">
          <label>
            <input
              type="radio"
              name="bov-pref-env-scope"
              checked={preferences.envScope === 'per-spec'}
              onChange={() => onChange({ envScope: 'per-spec' })}
            />
            <span>Per spec</span>
          </label>
          <label>
            <input
              type="radio"
              name="bov-pref-env-scope"
              checked={preferences.envScope === 'global'}
              onChange={() => onChange({ envScope: 'global' })}
            />
            <span>Global</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

function ServersTab({
  serversState,
  schemes,
  onSetActive,
  onUpsertServer,
  onRemoveServer,
}: {
  serversState: SavedServersState;
  schemes: Record<string, SecuritySchemeObject>;
  onSetActive: (id: string) => void;
  onUpsertServer: (server: SavedServer) => void;
  onRemoveServer: (id: string) => void;
}) {
  const fallbackId = serversState.activeId ?? serversState.servers[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(fallbackId);
  const selected = serversState.servers.find((server) => server.id === selectedId) ?? null;

  const addServer = () => {
    const id = `user-${generateId()}`;
    const newServer: SavedServer = {
      id,
      label: 'New server',
      url: 'https://api.example.com',
      variables: {},
      credentials: {},
      source: 'user',
    };
    onUpsertServer(newServer);
    setSelectedId(id);
  };

  return (
    <div className="bov-settings-section bov-servers-tab">
      <div className="bov-servers-list">
        <div className="bov-servers-list-header">
          <h4>All servers</h4>
          <button type="button" className="bov-button bov-button-quiet" onClick={addServer}>
            + Add
          </button>
        </div>
        <ul role="list">
          {serversState.servers.map((server) => (
            <li key={server.id}>
              <button
                type="button"
                className="bov-servers-list-item"
                data-active={selectedId === server.id ? 'true' : 'false'}
                onClick={() => setSelectedId(server.id)}
              >
                <div className="bov-servers-list-item-main">
                  <strong>{server.label}</strong>
                  <code>{server.url || '(relative)'}</code>
                </div>
                <div className="bov-servers-list-item-meta">
                  {serversState.activeId === server.id ? <span className="bov-pill bov-pill-active">Active</span> : null}
                  <span className="bov-faint-text">{server.source}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="bov-servers-detail">
        {selected ? (
          <ServerForm
            key={selected.id}
            server={selected}
            schemes={schemes}
            isActive={serversState.activeId === selected.id}
            onChange={(server) => onUpsertServer(server)}
            onSetActive={() => onSetActive(selected.id)}
            onRemove={() => {
              onRemoveServer(selected.id);
              setSelectedId(null);
            }}
          />
        ) : (
          <p className="bov-muted">Pick a server on the left, or add a new one.</p>
        )}
      </div>
    </div>
  );
}

function ServerForm({
  server,
  schemes,
  isActive,
  onChange,
  onSetActive,
  onRemove,
}: {
  server: SavedServer;
  schemes: Record<string, SecuritySchemeObject>;
  isActive: boolean;
  onChange: (server: SavedServer) => void;
  onSetActive: () => void;
  onRemove: () => void;
}) {
  const variableNames = useMemo(() => extractServerVariableNames(server.url), [server.url]);
  const schemeEntries = Object.entries(schemes);

  const updateField = <K extends keyof SavedServer>(field: K, value: SavedServer[K]) => {
    onChange({ ...server, [field]: value });
  };

  const updateCredential = (schemeName: string, credential: SecurityCredential | undefined) => {
    const next = { ...server.credentials };
    if (isEmptyCredential(credential)) {
      delete next[schemeName];
    } else {
      next[schemeName] = credential;
    }
    onChange({ ...server, credentials: next });
  };

  return (
    <div className="bov-server-form">
      <header className="bov-server-form-header">
        <div>
          <input
            className="bov-server-form-label"
            value={server.label}
            onChange={(event) => updateField('label', event.currentTarget.value)}
            placeholder="Server label"
          />
          <p className="bov-faint-text bov-server-form-id">id: {server.id}</p>
        </div>
        <div className="bov-server-form-actions">
          {isActive ? (
            <span className="bov-pill bov-pill-active">Active</span>
          ) : (
            <button type="button" className="bov-button" onClick={onSetActive}>
              Set active
            </button>
          )}
          {server.source === 'user' ? (
            <button type="button" className="bov-button bov-button-quiet" onClick={onRemove}>
              Remove
            </button>
          ) : null}
        </div>
      </header>

      <fieldset className="bov-pref-group">
        <legend>Base URL</legend>
        <input
          value={server.url}
          onChange={(event) => updateField('url', event.currentTarget.value)}
          placeholder="https://api.example.com"
        />
        <p className="bov-pref-help">Use <code>{'{name}'}</code> to define variables.</p>
      </fieldset>

      {variableNames.length ? (
        <fieldset className="bov-pref-group">
          <legend>Variables</legend>
          {variableNames.map((name) => (
            <label key={name} className="bov-server-form-row">
              <span>{name}</span>
              <input
                value={server.variables[name] ?? ''}
                onChange={(event) =>
                  updateField('variables', { ...server.variables, [name]: event.currentTarget.value })
                }
                placeholder={`Value for {${name}}`}
              />
            </label>
          ))}
        </fieldset>
      ) : null}

      <fieldset className="bov-pref-group">
        <legend>Credentials</legend>
        {schemeEntries.length ? (
          <div className="bov-server-form-credentials">
            {schemeEntries.map(([schemeName, scheme]) => (
              <SecuritySchemeCredentialField
                key={schemeName}
                credential={server.credentials[schemeName]}
                name={schemeName}
                onChange={(credential) => updateCredential(schemeName, credential)}
                scheme={scheme}
              />
            ))}
          </div>
        ) : (
          <p className="bov-muted">No supported security schemes in this spec.</p>
        )}
      </fieldset>
    </div>
  );
}

function CookiesTab({
  serversState,
  cookiesByServer,
  onSetCookiesForServer,
}: {
  serversState: SavedServersState;
  cookiesByServer: Record<string, SavedCookie[]>;
  onSetCookiesForServer: (serverId: string, updater: (prev: SavedCookie[]) => SavedCookie[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(serversState.activeId ?? serversState.servers[0]?.id ?? null);
  const selected = serversState.servers.find((server) => server.id === selectedId) ?? null;
  const cookies = selected ? cookiesByServer[selected.id] ?? [] : [];

  const addCookie = () => {
    if (!selected) return;
    const cookie: SavedCookie = { id: generateId(), name: '', value: '' };
    onSetCookiesForServer(selected.id, (prev) => [...prev, cookie]);
  };

  return (
    <div className="bov-settings-section bov-cookies-tab">
      <fieldset className="bov-pref-group">
        <legend>Server</legend>
        <select
          value={selectedId ?? ''}
          onChange={(event) => setSelectedId(event.currentTarget.value)}
        >
          {serversState.servers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.label}
            </option>
          ))}
        </select>
        <p className="bov-pref-help">
          Cookies are stored per server. The viewer attaches them as a <code>Cookie</code> header on Try-it-out requests; <code>Set-Cookie</code> headers from responses are merged back when CORS exposes them.
        </p>
      </fieldset>

      <div className="bov-cookies-list-header">
        <h4>Cookies for {selected?.label ?? '—'}</h4>
        <button type="button" className="bov-button bov-button-quiet" onClick={addCookie} disabled={!selected}>
          + Add cookie
        </button>
      </div>

      {cookies.length ? (
        <ul className="bov-cookies-list" role="list">
          {cookies.map((cookie) => (
            <li key={cookie.id}>
              <CookieEditor
                cookie={cookie}
                onChange={(next) =>
                  selected && onSetCookiesForServer(selected.id, (prev) => prev.map((c) => (c.id === cookie.id ? next : c)))
                }
                onRemove={() =>
                  selected && onSetCookiesForServer(selected.id, (prev) => prev.filter((c) => c.id !== cookie.id))
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="bov-muted">No cookies set for this server yet.</p>
      )}
    </div>
  );
}

function CookieEditor({
  cookie,
  onChange,
  onRemove,
}: {
  cookie: SavedCookie;
  onChange: (cookie: SavedCookie) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bov-cookie-editor">
      <div className="bov-cookie-editor-row">
        <label>
          <span>Name</span>
          <input
            value={cookie.name}
            onChange={(event) => onChange({ ...cookie, name: event.currentTarget.value })}
            placeholder="session_id"
          />
        </label>
        <label>
          <span>Value</span>
          <input
            value={cookie.value}
            onChange={(event) => onChange({ ...cookie, value: event.currentTarget.value })}
          />
        </label>
      </div>
      <div className="bov-cookie-editor-row">
        <label>
          <span>Path</span>
          <input
            value={cookie.path ?? ''}
            onChange={(event) => onChange({ ...cookie, path: event.currentTarget.value || undefined })}
            placeholder="/"
          />
        </label>
        <label>
          <span>Expires</span>
          <input
            type="text"
            value={cookie.expires ?? ''}
            onChange={(event) => onChange({ ...cookie, expires: event.currentTarget.value || undefined })}
            placeholder="(session)"
          />
        </label>
      </div>
      <div className="bov-cookie-editor-actions">
        <button type="button" className="bov-button bov-button-quiet" onClick={onRemove}>
          Delete
        </button>
      </div>
    </div>
  );
}

function ActiveCookiesPanel({
  cookies,
  origin,
  serverLabel,
  onChange,
  onOpenSettings,
}: {
  cookies: SavedCookie[];
  origin: string | null;
  serverLabel: string;
  onChange: (updater: (prev: SavedCookie[]) => SavedCookie[]) => void;
  onOpenSettings: () => void;
}) {
  const live = cookies.filter((cookie) => !cookie.expires || new Date(cookie.expires).getTime() > Date.now());

  return (
    <details className="bov-active-cookies">
      <summary>
        Cookies for {serverLabel || 'active server'} ({live.length})
        {origin ? <span className="bov-faint-text"> · sent to {origin}</span> : null}
      </summary>
      {live.length ? (
        <ul role="list" className="bov-active-cookies-list">
          {live.map((cookie) => (
            <li key={cookie.id}>
              <code>{cookie.name || '(unnamed)'}</code>
              <span className="bov-faint-text">=</span>
              <span className="bov-active-cookies-value">{cookie.value}</span>
              <button
                type="button"
                className="bov-button bov-button-quiet"
                onClick={() => onChange((prev) => prev.filter((c) => c.id !== cookie.id))}
                aria-label={`Delete cookie ${cookie.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bov-muted">No cookies will be sent.</p>
      )}
      <button type="button" className="bov-link-button" onClick={onOpenSettings}>
        Manage cookies in Settings
      </button>
    </details>
  );
}

function OnboardingModal({
  preferences,
  onComplete,
}: {
  preferences: Preferences;
  onComplete: (patch: Partial<Preferences>) => void;
}) {
  const [scope, setScope] = useState<EnvScope>(preferences.envScope);
  return (
    <ModalShell labelledBy="bov-onboarding-title" dismissible={false}>
      <header className="bov-modal-header">
        <div>
          <p className="bov-kicker">Welcome</p>
          <h2 id="bov-onboarding-title">Quick setup</h2>
        </div>
      </header>
      <div className="bov-modal-body">
        <p className="bov-pref-help">
          Where should saved servers, variables, and Try-it-out values live? You can change this any
          time from Settings.
        </p>
        <fieldset className="bov-pref-group">
          <legend>Environment scope</legend>
          <label className="bov-pref-radio">
            <input
              type="radio"
              name="bov-onboarding-scope"
              checked={scope === 'per-spec'}
              onChange={() => setScope('per-spec')}
            />
            <span>
              <strong>Per spec</strong>
              <small>Each API document keeps its own values. Best when working across unrelated APIs.</small>
            </span>
          </label>
          <label className="bov-pref-radio">
            <input
              type="radio"
              name="bov-onboarding-scope"
              checked={scope === 'global'}
              onChange={() => setScope('global')}
            />
            <span>
              <strong>Global</strong>
              <small>One shared bucket across every spec. Best for staging/prod variables you reuse everywhere.</small>
            </span>
          </label>
        </fieldset>
      </div>
      <footer className="bov-modal-footer">
        <button type="button" className="bov-button bov-button-primary" onClick={() => onComplete({ envScope: scope })}>
          Get started
        </button>
      </footer>
    </ModalShell>
  );
}

type SavedServer = {
  id: string;
  label: string;
  url: string;
  variables: Record<string, string>;
  credentials: TryItOutAuthCredentials;
  source: 'spec' | 'user';
};

type SavedServersState = {
  servers: SavedServer[];
  activeId: string | null;
};

type SavedCookie = {
  id: string;
  name: string;
  value: string;
  path?: string;
  expires?: string;
};

type ParsedSetCookie = { name: string; value: string; path?: string; expires?: string };

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function getSpecKey(document: OpenAPIObject) {
  return `${document.info?.title ?? 'OpenAPI'}:${document.info?.version ?? ''}`;
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

function getAuthStorageKey(document: OpenAPIObject) {
  return `better-openapi-viewer:auth:${getSpecKey(document)}`;
}

function getServersStorageKey(document: OpenAPIObject) {
  return `better-openapi-viewer:servers:${getSpecKey(document)}`;
}

function getCookiesStorageKey(document: OpenAPIObject, serverId: string) {
  return `better-openapi-viewer:cookies:${getSpecKey(document)}:${serverId}`;
}

function readPersistedServers(document: OpenAPIObject): SavedServersState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getServersStorageKey(document));
    return raw ? (JSON.parse(raw) as SavedServersState) : null;
  } catch {
    return null;
  }
}

function writePersistedServers(document: OpenAPIObject, state: SavedServersState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getServersStorageKey(document), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function buildInitialServersState(
  document: OpenAPIObject,
  preauthorized: TryItOutAuthCredentials,
): SavedServersState {
  const specServers: ServerObject[] = (document.servers && document.servers.length
    ? document.servers
    : [{ url: '', description: 'Default' }]) as ServerObject[];
  const servers: SavedServer[] = specServers.map((spec, index) => ({
    id: `spec-${index}`,
    label: spec.description ?? (spec.url || `Server ${index + 1}`),
    url: spec.url,
    variables: createInitialServerVariables(spec),
    credentials: index === 0 ? { ...preauthorized } : {},
    source: 'spec',
  }));
  return { servers, activeId: servers[0]?.id ?? null };
}

function useSavedServers(document: OpenAPIObject, preauthorized: TryItOutAuthCredentials) {
  const [state, setState] = useState<SavedServersState>(
    () => readPersistedServers(document) ?? buildInitialServersState(document, preauthorized),
  );

  const apply = useCallback(
    (updater: (prev: SavedServersState) => SavedServersState) => {
      setState((prev) => {
        const next = updater(prev);
        writePersistedServers(document, next);
        return next;
      });
    },
    [document],
  );

  const setActive = useCallback(
    (id: string) => apply((prev) => (prev.activeId === id ? prev : { ...prev, activeId: id })),
    [apply],
  );

  const upsertServer = useCallback(
    (server: SavedServer) =>
      apply((prev) => {
        const exists = prev.servers.some((s) => s.id === server.id);
        const servers = exists
          ? prev.servers.map((s) => (s.id === server.id ? server : s))
          : [...prev.servers, server];
        const activeId = prev.activeId ?? server.id;
        return { servers, activeId };
      }),
    [apply],
  );

  const removeServer = useCallback(
    (id: string) =>
      apply((prev) => {
        const servers = prev.servers.filter((s) => s.id !== id);
        const activeId = prev.activeId === id ? servers[0]?.id ?? null : prev.activeId;
        return { servers, activeId };
      }),
    [apply],
  );

  return { state, setActive, upsertServer, removeServer };
}

function readPersistedCookies(document: OpenAPIObject, serverId: string): SavedCookie[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getCookiesStorageKey(document, serverId));
    return raw ? (JSON.parse(raw) as SavedCookie[]) : [];
  } catch {
    return [];
  }
}

function writePersistedCookies(document: OpenAPIObject, serverId: string, cookies: SavedCookie[]) {
  if (typeof window === 'undefined') return;
  try {
    if (cookies.length) {
      window.localStorage.setItem(getCookiesStorageKey(document, serverId), JSON.stringify(cookies));
    } else {
      window.localStorage.removeItem(getCookiesStorageKey(document, serverId));
    }
  } catch {
    // ignore
  }
}

function useCookieStore(document: OpenAPIObject, servers: SavedServer[]) {
  const [cookiesByServer, setCookiesByServer] = useState<Record<string, SavedCookie[]>>(() => {
    const initial: Record<string, SavedCookie[]> = {};
    for (const server of servers) {
      initial[server.id] = readPersistedCookies(document, server.id);
    }
    return initial;
  });

  useEffect(() => {
    setCookiesByServer((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const server of servers) {
        if (!(server.id in next)) {
          next[server.id] = readPersistedCookies(document, server.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [document, servers]);

  const setCookiesForServer = useCallback(
    (serverId: string, updater: (prev: SavedCookie[]) => SavedCookie[]) => {
      setCookiesByServer((prev) => {
        const current = prev[serverId] ?? [];
        const next = updater(current);
        writePersistedCookies(document, serverId, next);
        return { ...prev, [serverId]: next };
      });
    },
    [document],
  );

  return [cookiesByServer, setCookiesForServer] as const;
}

function parseSetCookieHeader(header: string): ParsedSetCookie | null {
  const parts = header.split(';').map((p) => p.trim()).filter(Boolean);
  const first = parts[0];
  if (!first) return null;
  const equalsIndex = first.indexOf('=');
  if (equalsIndex === -1) return null;
  const name = first.slice(0, equalsIndex).trim();
  const value = first.slice(equalsIndex + 1).trim();
  if (!name) return null;
  const result: ParsedSetCookie = { name, value };
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i] ?? '';
    const eq = attr.indexOf('=');
    const k = (eq === -1 ? attr : attr.slice(0, eq)).trim().toLowerCase();
    const v = eq === -1 ? '' : attr.slice(eq + 1).trim();
    if (k === 'path') result.path = v;
    else if (k === 'expires') result.expires = v;
    else if (k === 'max-age') {
      const seconds = Number.parseInt(v, 10);
      if (Number.isFinite(seconds)) {
        result.expires = new Date(Date.now() + seconds * 1000).toISOString();
      }
    }
  }
  return result;
}

function mergeSetCookieIntoJar(jar: SavedCookie[], parsed: ParsedSetCookie): SavedCookie[] {
  const matchPath = parsed.path ?? '/';
  const existingIndex = jar.findIndex((c) => c.name === parsed.name && (c.path ?? '/') === matchPath);
  if (existingIndex >= 0) {
    return jar.map((c, i) => (i === existingIndex ? { ...c, ...parsed } : c));
  }
  return [...jar, { id: generateId(), ...parsed }];
}

function formatCookieHeader(cookies: SavedCookie[]): string {
  const now = Date.now();
  return cookies
    .filter((c) => c.name && (!c.expires || new Date(c.expires).getTime() > now))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

function getSetCookieHeaders(headers: Headers): string[] {
  const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function getRequestOrigin(url: string): string | null {
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'http://localhost' : window.location.href);
    return parsed.origin;
  } catch {
    return null;
  }
}

function extractServerVariableNames(url: string): string[] {
  const names: string[] = [];
  for (const match of url.matchAll(/\{([^}]+)\}/g)) {
    const name = match[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
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

function getSettingsShortcutLabel() {
  if (typeof navigator === 'undefined') return 'Ctrl+,';
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘,' : 'Ctrl+,';
}
