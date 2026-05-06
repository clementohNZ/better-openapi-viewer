export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export type OpenAPIVersion = 'openapi-3.0' | 'openapi-3.1' | 'swagger-2.0' | 'unsupported' | 'unknown';

export type OpenAPIObject = {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  host?: string;
  basePath?: string;
  schemes?: string[];
  produces?: string[];
  consumes?: string[];
  servers?: ServerObject[];
  paths?: Record<string, PathItemObject | undefined>;
  components?: ComponentsObject | unknown;
  definitions?: Record<string, unknown>;
  securityDefinitions?: Record<string, SecuritySchemeObject | ReferenceObject | unknown>;
  tags?: Array<TagObject>;
  security?: SecurityRequirementObject[];
  webhooks?: Record<string, PathItemObject | undefined>;
};

export type VendorExtensions = Record<never, never>;

export type ComponentsObject = {
  schemas?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  requestBodies?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  examples?: Record<string, unknown>;
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject | unknown>;
};

export type TagObject = {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
};

export type ExternalDocumentationObject = {
  description?: string;
  url: string;
};

export type ServerObject = {
  url: string;
  description?: string;
  variables?: Record<string, { default: string | number | boolean; enum?: Array<string | number | boolean>; description?: string }>;
};

export type ServerVariableObject = NonNullable<ServerObject['variables']>[string];

export type SecurityRequirementObject = Record<string, string[]>;

export type PathItemObject = {
  $ref?: string;
  summary?: string;
  description?: string;
  servers?: ServerObject[];
  parameters?: Array<ParameterObject | ReferenceObject>;
} & Partial<Record<HttpMethod, OperationObject>>;

export type OperationObject = {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  deprecated?: boolean;
  parameters?: Array<ParameterObject | ReferenceObject>;
  requestBody?: RequestBodyObject | ReferenceObject | unknown;
  responses?: Record<string, ResponseObject | ReferenceObject | unknown>;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
  callbacks?: Record<string, unknown>;
  consumes?: string[];
  produces?: string[];
};

export type ParameterObject = {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body' | 'formData';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  style?: ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject | ReferenceObject | unknown;
  content?: Record<string, MediaTypeObject>;
  example?: unknown;
  examples?: Record<string, ExampleObject | ReferenceObject | unknown>;
};

export type RequestBodyObject = {
  description?: string;
  content?: Record<string, MediaTypeObject>;
  required?: boolean;
};

export type ResponseObject = {
  description?: string;
  headers?: Record<string, unknown>;
  content?: Record<string, MediaTypeObject>;
  links?: Record<string, unknown>;
  schema?: SchemaObject | ReferenceObject | unknown;
  examples?: Record<string, unknown>;
};

export type MediaTypeObject = {
  schema?: SchemaObject | ReferenceObject | unknown;
  example?: unknown;
  examples?: Record<string, ExampleObject | ReferenceObject | unknown>;
  encoding?: Record<string, unknown>;
};

export type ExampleObject = {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
};

export type SchemaObject = {
  title?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  example?: unknown;
  examples?: unknown[] | Record<string, unknown>;
  required?: string[];
  properties?: Record<string, SchemaObject | ReferenceObject>;
  items?: SchemaObject | ReferenceObject;
  additionalProperties?: boolean | SchemaObject | ReferenceObject;
  allOf?: Array<SchemaObject | ReferenceObject>;
  oneOf?: Array<SchemaObject | ReferenceObject>;
  anyOf?: Array<SchemaObject | ReferenceObject>;
  not?: SchemaObject | ReferenceObject;
  discriminator?: unknown;
  xml?: unknown;
};

export type ReferenceObject = {
  $ref: string;
  summary?: string;
  description?: string;
};

export type DocumentIssue = {
  code: string;
  message: string;
  pointer?: string;
};

export type NormalizedDocument = {
  source: OpenAPIObject;
  document: OpenAPIObject;
  version: OpenAPIVersion;
  title?: string;
  description?: string;
  issues: DocumentIssue[];
  operations: NormalizedOperation[];
  tags: OperationTagGroup[];
};

export type NormalizeDocumentOptions = {
  resolveInternalRefs?: boolean;
};

export type NormalizedOperation = {
  id: string;
  method: HttpMethod;
  path: string;
  tags: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  deprecated: boolean;
  parameters: Array<ParameterObject | ReferenceObject>;
  requestBody?: RequestBodyObject | ReferenceObject | unknown;
  responses: Record<string, ResponseObject | ReferenceObject | unknown>;
  security: SecurityRequirementObject[];
  servers: ServerObject[];
  contentTypes: string[];
  responseStatusCodes: string[];
  parameterNames: string[];
  schemaNames: string[];
  requiresAuth: boolean;
  vendorExtensions: Record<string, unknown>;
  searchText: string;
};

export type OperationTagGroup = {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operations: NormalizedOperation[];
};

export type OperationFilter = {
  query?: string;
  methods?: HttpMethod[];
  tags?: string[];
  auth?: 'any' | 'required' | 'none';
  deprecated?: boolean;
  contentTypes?: string[];
};

export type ViewerLayout = 'BaseLayout' | 'StandaloneLayout' | string;

export type ViewerDefaultExpansion = 'list' | 'full' | 'none';

export type ViewerSyntaxHighlightingConfig = {
  activated?: boolean;
  theme?: string;
};

export type ViewerSorter<T> = ((left: T, right: T) => number) | 'alpha' | 'method' | 'none';

export type ViewerPlugin = {
  name?: string;
  [key: string]: unknown;
};

export type ViewerConfig = {
  routePath?: string;
  jsonPath?: string;
  title?: string;
  layout?: ViewerLayout;
  defaultExpansion?: ViewerDefaultExpansion;
  deepLinking?: boolean;
  filter?: boolean | string;
  displayRequestDuration?: boolean;
  persistAuthorization?: boolean;
  syntaxHighlight?: boolean | ViewerSyntaxHighlightingConfig;
  supportedSubmitMethods?: HttpMethod[];
  operationsSorter?: ViewerSorter<NormalizedOperation>;
  tagsSorter?: ViewerSorter<OperationTagGroup>;
  defaultModelExpandDepth?: number;
  plugins?: ViewerPlugin[];
};

export type ResolvedViewerConfig = Required<
  Pick<
    ViewerConfig,
    | 'routePath'
    | 'jsonPath'
    | 'title'
    | 'layout'
    | 'defaultExpansion'
    | 'deepLinking'
    | 'filter'
    | 'displayRequestDuration'
    | 'persistAuthorization'
    | 'syntaxHighlight'
    | 'supportedSubmitMethods'
    | 'defaultModelExpandDepth'
    | 'plugins'
  >
> &
  Pick<ViewerConfig, 'operationsSorter' | 'tagsSorter'>;

export type ResolvedReference<T = unknown> = {
  value: T;
  ref: string;
};

export type ExternalReferenceLoader = (ref: string) => unknown | Promise<unknown>;

export type ResolveReferenceOptions = {
  loader?: ExternalReferenceLoader;
};

export type ResolvedExternalReference<T = unknown> = ResolvedReference<T> & {
  external: true;
};

export type SchemaExampleOptions = {
  requiredOnly?: boolean;
  maxDepth?: number;
};

export type KnownParameterStyle = 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject' | 'matrix' | 'label';

export type ParameterStyle = KnownParameterStyle | string;

export type SerializablePrimitive = string | number | boolean | null;

export type SerializableParameterValue =
  | SerializablePrimitive
  | SerializablePrimitive[]
  | Record<string, SerializablePrimitive | SerializablePrimitive[] | Record<string, SerializablePrimitive>>;

export type SerializedParameterPart = {
  name: string;
  value: string;
};

export type SecuritySchemeObject = {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | string;
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie' | string;
  scheme?: string;
  bearerFormat?: string;
  flows?: unknown;
  openIdConnectUrl?: string;
};

export type BasicAuthCredentials = {
  username: string;
  password: string;
};

export type TokenAuthCredentials = {
  value: string;
  tokenType?: string;
  expiresAt?: string | number | Date;
  scopes?: string[];
};

export type OAuthFlowType = 'implicit' | 'password' | 'clientCredentials' | 'authorizationCode';

export type OAuthFlowObject = {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
};

export type OAuthFlowsObject = Partial<Record<OAuthFlowType, OAuthFlowObject>>;

export type OAuthFlowMetadata = OAuthFlowObject & {
  type: OAuthFlowType;
  scopes: Record<string, string>;
};

export type SecuritySchemeMetadata = {
  name: string;
  type: SecuritySchemeObject['type'];
  description?: string;
  scheme?: string;
  bearerFormat?: string;
  apiKeyLocation?: SecuritySchemeObject['in'];
  apiKeyName?: string;
  oauthFlows: OAuthFlowMetadata[];
  openIdConnectUrl?: string;
};

export type SecurityCredential =
  | string
  | BasicAuthCredentials
  | TokenAuthCredentials;

export type TryItOutAuthCredentials = Record<string, SecurityCredential | undefined>;

export type PreauthorizeConfig = {
  auth?: TryItOutAuthCredentials;
  credentials?: TryItOutAuthCredentials;
};

export type TryItOutResponse = {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  body?: unknown;
};

export type TryItOutRequestInterceptorContext = {
  input: TryItOutRequestInput;
};

export type TryItOutResponseInterceptorContext = TryItOutRequestInterceptorContext & {
  request: TryItOutRequest;
};

export type TryItOutRequestInterceptor = (request: TryItOutRequest, context: TryItOutRequestInterceptorContext) => TryItOutRequest;

export type TryItOutResponseInterceptor = (response: TryItOutResponse, context: TryItOutResponseInterceptorContext) => TryItOutResponse;

export type TryItOutInterceptors = {
  request?: TryItOutRequestInterceptor;
  response?: TryItOutResponseInterceptor;
};

export type TryItOutRequestSnippetLanguage = 'curl' | 'fetch' | 'httpie' | 'python';

export type TryItOutRequestInput = {
  document?: OpenAPIObject;
  operation: Pick<NormalizedOperation, 'method' | 'path' | 'parameters' | 'requestBody' | 'security' | 'servers'>;
  serverUrl?: string;
  server?: ServerObject;
  serverVariables?: Record<string, string | number | boolean>;
  parameters?: Record<string, SerializableParameterValue | undefined>;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
  body?: unknown;
  contentType?: string;
  auth?: TryItOutAuthCredentials;
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject | unknown>;
  interceptors?: TryItOutInterceptors;
};

export type TryItOutRequest = {
  method: Uppercase<HttpMethod>;
  url: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body?: string;
};

export type ResponseStatusRange = '1xx' | '2xx' | '3xx' | '4xx' | '5xx' | 'default' | 'unknown';

export type ResponseCategory = 'informational' | 'success' | 'redirect' | 'client-error' | 'server-error' | 'default' | 'unknown';

export type NormalizedResponse = {
  statusCode: string;
  statusRange: ResponseStatusRange;
  category: ResponseCategory;
  description?: string;
  contentTypes: string[];
  headers: Record<string, unknown>;
  links: Record<string, unknown>;
  schema?: SchemaObject | ReferenceObject | unknown;
  example?: unknown;
  raw: ResponseObject | ReferenceObject | unknown;
};

export type SchemaTreeNodeKind = 'schema' | 'property' | 'array-item' | 'additional-properties' | 'composition' | 'reference';

export type SchemaTreeNode = {
  id: string;
  name: string;
  path: string;
  kind: SchemaTreeNodeKind;
  type?: string;
  format?: string;
  description?: string;
  required: boolean;
  nullable: boolean;
  deprecated: boolean;
  readOnly: boolean;
  writeOnly: boolean;
  ref?: string;
  enumValues?: unknown[];
  example?: unknown;
  children: SchemaTreeNode[];
  schema: SchemaObject | ReferenceObject | unknown;
};

export type SchemaTreeOptions = {
  name?: string;
  path?: string;
  required?: boolean;
  maxDepth?: number;
};

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
  expected?: string;
  actual?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type ParameterValidationInput = {
  parameters: Array<ParameterObject | ReferenceObject>;
  values?: Record<string, unknown>;
};

export type RequestBodyValidationInput = {
  requestBody?: RequestBodyObject | ReferenceObject | unknown;
  body?: unknown;
  contentType?: string;
};

export type NormalizedServerVariable = {
  name: string;
  defaultValue: string | number | boolean;
  enumValues: Array<string | number | boolean>;
  description?: string;
  value: string | number | boolean;
  valid: boolean;
};

const HTTP_METHODS: HttpMethod[] = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const DEFAULT_TAG = 'default';
const DEFAULT_SUPPORTED_SUBMIT_METHODS: HttpMethod[] = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

export const DEFAULT_VIEWER_CONFIG: ResolvedViewerConfig = {
  routePath: 'docs',
  jsonPath: 'docs/openapi.json',
  title: 'Better OpenAPI Viewer',
  layout: 'BaseLayout',
  defaultExpansion: 'list',
  deepLinking: true,
  filter: true,
  displayRequestDuration: false,
  persistAuthorization: false,
  syntaxHighlight: { activated: true },
  supportedSubmitMethods: DEFAULT_SUPPORTED_SUBMIT_METHODS,
  defaultModelExpandDepth: 1,
  plugins: [],
};

export function mergeViewerConfig(...configs: Array<ViewerConfig | undefined>): ResolvedViewerConfig {
  return configs.reduce<ResolvedViewerConfig>((merged, config) => {
    if (!config) {
      return merged;
    }

    return {
      ...merged,
      ...config,
      supportedSubmitMethods: config.supportedSubmitMethods ? [...config.supportedSubmitMethods] : merged.supportedSubmitMethods,
      plugins: config.plugins ? [...config.plugins] : merged.plugins,
      syntaxHighlight: mergeSyntaxHighlightConfig(merged.syntaxHighlight, config.syntaxHighlight),
    };
  }, cloneViewerConfig(DEFAULT_VIEWER_CONFIG));
}

export function sortOperations(operations: NormalizedOperation[], sorter: ViewerConfig['operationsSorter'] = 'none'): NormalizedOperation[] {
  return [...operations].sort(getOperationSorter(sorter));
}

export function sortOperationTags(tags: OperationTagGroup[], sorter: ViewerConfig['tagsSorter'] = 'none'): OperationTagGroup[] {
  return [...tags].sort(getTagSorter(sorter));
}

export function isSubmitMethodSupported(method: HttpMethod | Uppercase<HttpMethod> | string, config: Pick<ViewerConfig, 'supportedSubmitMethods'> = {}): boolean {
  const normalized = method.toLowerCase() as HttpMethod;
  const supportedMethods = config.supportedSubmitMethods ?? DEFAULT_VIEWER_CONFIG.supportedSubmitMethods;
  return supportedMethods.includes(normalized);
}

export function normalizeOpenApiDocument(document: OpenAPIObject, options: NormalizeDocumentOptions = {}): NormalizedDocument {
  const issues = validateOpenApiDocument(document);
  const normalized = options.resolveInternalRefs ? resolveInternalReferences(document, { preserveRefs: true }) : document;
  const operations = getOperations(normalized);

  return {
    source: document,
    document: normalized,
    version: detectOpenApiVersion(document),
    title: document.info?.title,
    description: document.info?.description,
    issues,
    operations,
    tags: groupOperationsByTag(operations, normalized.tags),
  };
}

export function validateOpenApiDocument(document: OpenAPIObject): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  const version = detectOpenApiVersion(document);

  if (version === 'unknown') {
    issues.push({ code: 'missing-version', message: 'Document is missing an openapi or swagger version field.' });
  } else if (version === 'unsupported') {
    issues.push({ code: 'unsupported-version', message: `Unsupported OpenAPI version: ${document.openapi ?? document.swagger}.` });
  }

  if (!document.paths || typeof document.paths !== 'object') {
    issues.push({ code: 'missing-paths', message: 'Document is missing a paths object.', pointer: '/paths' });
  }

  return issues;
}

export function detectOpenApiVersion(document: Pick<OpenAPIObject, 'openapi' | 'swagger'>): OpenAPIVersion {
  if (document.openapi?.startsWith('3.1.')) {
    return 'openapi-3.1';
  }

  if (document.openapi?.startsWith('3.0.')) {
    return 'openapi-3.0';
  }

  if (document.swagger === '2.0') {
    return 'swagger-2.0';
  }

  if (document.openapi || document.swagger) {
    return 'unsupported';
  }

  return 'unknown';
}

export function getOperations(document: OpenAPIObject): NormalizedOperation[] {
  return Object.entries(document.paths ?? {}).flatMap(([path, rawPathItem]) => {
    const pathItem = asPathItem(rawPathItem);

    if (!pathItem) {
      return [];
    }

    return HTTP_METHODS.flatMap((method) => {
      const operation = pathItem[method];
      if (!operation) {
        return [];
      }

      const tags = operation.tags?.length ? operation.tags : [DEFAULT_TAG];
      const parameters = mergeParameters(pathItem.parameters, operation.parameters);
      const responses = operation.responses ?? {};
      const contentTypes = getOperationContentTypes(operation, document);
      const security = operation.security ?? document.security ?? [];
      const servers = getOperationServers(document, pathItem, operation);
      const id = operation.operationId ?? `${method}:${path}`;
      const parameterNames = getParameterNames(parameters);
      const schemaNames = getOperationSchemaNames(operation, responses);
      const responseStatusCodes = Object.keys(responses);

      return [
        {
          id,
          method,
          path,
          tags,
          summary: operation.summary,
          description: operation.description,
          externalDocs: operation.externalDocs,
          operationId: operation.operationId,
          deprecated: Boolean(operation.deprecated),
          parameters,
          requestBody: operation.requestBody,
          responses,
          security,
          servers,
          contentTypes,
          responseStatusCodes,
          parameterNames,
          schemaNames,
          requiresAuth: security.length > 0,
          vendorExtensions: getVendorExtensions(operation),
          searchText: buildSearchText({
            method,
            path,
            tags,
            operation,
            parameters,
            responses,
            contentTypes,
            parameterNames,
            schemaNames,
          }),
        },
      ];
    });
  });
}

export function searchOperations(operations: NormalizedOperation[], query: string): NormalizedOperation[] {
  return filterOperations(operations, { query });
}

export function filterOperations(operations: NormalizedOperation[], filter: OperationFilter = {}): NormalizedOperation[] {
  const query = filter.query?.trim().toLowerCase();
  const methods = new Set(filter.methods);
  const tags = new Set(filter.tags);
  const contentTypes = new Set(filter.contentTypes?.map((contentType) => contentType.toLowerCase()));

  return operations.filter((operation) => {
    if (query && !operation.searchText.includes(query)) {
      return false;
    }

    if (methods.size && !methods.has(operation.method)) {
      return false;
    }

    if (tags.size && !operation.tags.some((tag) => tags.has(tag))) {
      return false;
    }

    if (filter.auth === 'required' && !operation.requiresAuth) {
      return false;
    }

    if (filter.auth === 'none' && operation.requiresAuth) {
      return false;
    }

    if (typeof filter.deprecated === 'boolean' && operation.deprecated !== filter.deprecated) {
      return false;
    }

    if (contentTypes.size && !operation.contentTypes.some((contentType) => contentTypes.has(contentType.toLowerCase()))) {
      return false;
    }

    return true;
  });
}

export function groupOperationsByTag(operations: NormalizedOperation[], tags: TagObject[] = []): OperationTagGroup[] {
  const metadata = new Map(tags.map((tag) => [tag.name, tag]));
  const groups = new Map<string, OperationTagGroup>();

  for (const operation of operations) {
    for (const tagName of operation.tags.length ? operation.tags : [DEFAULT_TAG]) {
      const tag = metadata.get(tagName);
      const group = groups.get(tagName) ?? {
        name: tagName,
        description: tag?.description,
        externalDocs: tag?.externalDocs,
        operations: [],
      };

      group.operations.push(operation);
      groups.set(tagName, group);
    }
  }

  for (const tag of tags) {
    if (!groups.has(tag.name)) {
      groups.set(tag.name, { name: tag.name, description: tag.description, externalDocs: tag.externalDocs, operations: [] });
    }
  }

  return [...groups.values()];
}

export function resolveInternalReference<T = unknown>(document: unknown, ref: string): ResolvedReference<T> | undefined {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  const value = getJsonPointer(document, ref.slice(1));
  return value === undefined ? undefined : { value: value as T, ref };
}

export async function resolveReference<T = unknown>(
  document: unknown,
  ref: string,
  options: ResolveReferenceOptions = {},
): Promise<ResolvedReference<T> | ResolvedExternalReference<T> | undefined> {
  const internal = resolveInternalReference<T>(document, ref);
  if (internal) {
    return internal;
  }

  if (!options.loader) {
    return undefined;
  }

  const value = await options.loader(ref);
  return value === undefined ? undefined : { value: value as T, ref, external: true };
}

export function resolveInternalReferences<T>(value: T, options: { preserveRefs?: boolean; maxDepth?: number } = {}): T {
  return resolveValue(value, value, new Set(), 0, options.maxDepth ?? 80, Boolean(options.preserveRefs)) as T;
}

export function getSchemaExample(schema: SchemaObject | ReferenceObject | unknown, options: SchemaExampleOptions = {}): unknown {
  return buildSchemaExample(schema, 0, options.maxDepth ?? 6, Boolean(options.requiredOnly));
}

export function getMediaTypeExample(mediaType: MediaTypeObject | undefined): unknown {
  if (!mediaType) {
    return undefined;
  }

  if ('example' in mediaType) {
    return mediaType.example;
  }

  const examples = Object.values(mediaType.examples ?? {});
  const firstExample = examples[0];

  if (firstExample && isObject(firstExample) && 'value' in firstExample) {
    return firstExample.value;
  }

  if (firstExample && !isReferenceObject(firstExample)) {
    return firstExample;
  }

  return getSchemaExample(mediaType.schema);
}

export function getResponseExample(response: ResponseObject | ReferenceObject | unknown, preferredContentType?: string): unknown {
  if (!isObject(response) || isReferenceObject(response) || !isObject(response.content)) {
    return undefined;
  }

  const content = response.content as Record<string, MediaTypeObject>;
  const mediaType = preferredContentType ? content[preferredContentType] : Object.values(content)[0];
  return getMediaTypeExample(mediaType);
}

export function classifyResponseStatus(statusCode: string | number): { statusRange: ResponseStatusRange; category: ResponseCategory } {
  const status = String(statusCode).toLowerCase();

  if (status === 'default') {
    return { statusRange: 'default', category: 'default' };
  }

  const firstDigit = status.match(/^[1-5]/)?.[0];
  if (!firstDigit) {
    return { statusRange: 'unknown', category: 'unknown' };
  }

  const statusRange = `${firstDigit}xx` as Exclude<ResponseStatusRange, 'default' | 'unknown'>;
  const categories: Record<Exclude<ResponseStatusRange, 'default' | 'unknown'>, ResponseCategory> = {
    '1xx': 'informational',
    '2xx': 'success',
    '3xx': 'redirect',
    '4xx': 'client-error',
    '5xx': 'server-error',
  };

  return { statusRange, category: categories[statusRange] };
}

export function normalizeResponses(
  responses: Record<string, ResponseObject | ReferenceObject | unknown> = {},
  options: { produces?: string[] } = {},
): NormalizedResponse[] {
  return Object.entries(responses)
    .map(([statusCode, response]) => normalizeResponse(statusCode, response, options))
    .sort((left, right) => getResponseSortValue(left.statusCode) - getResponseSortValue(right.statusCode));
}

export function normalizeResponse(
  statusCode: string | number,
  response: ResponseObject | ReferenceObject | unknown,
  options: { produces?: string[] } = {},
): NormalizedResponse {
  const classification = classifyResponseStatus(statusCode);
  const normalized: NormalizedResponse = {
    statusCode: String(statusCode),
    ...classification,
    contentTypes: [],
    headers: {},
    links: {},
    raw: response,
  };

  if (!isObject(response) || isReferenceObject(response)) {
    return normalized;
  }

  const content = isObject(response.content) ? (response.content as Record<string, MediaTypeObject>) : undefined;
  const swaggerSchema = response.schema;
  const contentTypes = content ? Object.keys(content) : swaggerSchema ? (options.produces?.length ? options.produces : ['application/json']) : [];

  return {
    ...normalized,
    description: typeof response.description === 'string' ? response.description : undefined,
    contentTypes,
    headers: isObject(response.headers) ? response.headers : {},
    links: isObject(response.links) ? response.links : {},
    schema: content ? Object.values(content).find(Boolean)?.schema : swaggerSchema,
    example: getResponseExample(response, contentTypes[0]),
  };
}

export function getRequestBodyMediaTypes(
  operation: Pick<OperationObject, 'requestBody' | 'parameters' | 'consumes'>,
  document: Pick<OpenAPIObject, 'consumes'> = {},
): string[] {
  const mediaTypes = new Set<string>();

  if (isObject(operation.requestBody) && !isReferenceObject(operation.requestBody) && isObject(operation.requestBody.content)) {
    for (const mediaType of Object.keys(operation.requestBody.content)) {
      mediaTypes.add(mediaType);
    }
  }

  const hasSwaggerBody = operation.parameters?.some((parameter) => !isReferenceObject(parameter) && (parameter.in === 'body' || parameter.in === 'formData'));
  if (hasSwaggerBody) {
    for (const mediaType of operation.consumes ?? document.consumes ?? ['application/json']) {
      mediaTypes.add(mediaType);
    }
  }

  return [...mediaTypes];
}

export function getSecuritySchemes(document: Pick<OpenAPIObject, 'components' | 'securityDefinitions'> | undefined): Record<string, SecuritySchemeObject | ReferenceObject | unknown> {
  const openApiSchemes = isObject(document?.components) && isObject(document.components.securitySchemes) ? document.components.securitySchemes : {};
  const swaggerSchemes = isObject(document?.securityDefinitions) ? document.securityDefinitions : {};
  return { ...swaggerSchemes, ...openApiSchemes };
}

export function getSecuritySchemeMetadata(
  schemes: Record<string, SecuritySchemeObject | ReferenceObject | unknown>,
): SecuritySchemeMetadata[] {
  return Object.entries(schemes).flatMap(([name, scheme]) => {
    if (!isSecuritySchemeObject(scheme)) {
      return [];
    }

    return [
      {
        name,
        type: scheme.type,
        description: scheme.description,
        scheme: scheme.scheme,
        bearerFormat: scheme.bearerFormat,
        apiKeyLocation: scheme.in,
        apiKeyName: scheme.name,
        oauthFlows: getOAuthFlows(scheme),
        openIdConnectUrl: scheme.type === 'openIdConnect' ? scheme.openIdConnectUrl : undefined,
      },
    ];
  });
}

export function getOAuthFlows(scheme: SecuritySchemeObject | ReferenceObject | unknown): OAuthFlowMetadata[] {
  if (!isSecuritySchemeObject(scheme) || scheme.type !== 'oauth2' || !isObject(scheme.flows)) {
    return [];
  }

  const flows = scheme.flows;
  return (['implicit', 'password', 'clientCredentials', 'authorizationCode'] as const).flatMap((type) => {
    const flow = flows[type];
    if (!isObject(flow)) {
      return [];
    }

    return [
      {
        type,
        authorizationUrl: typeof flow.authorizationUrl === 'string' ? flow.authorizationUrl : undefined,
        tokenUrl: typeof flow.tokenUrl === 'string' ? flow.tokenUrl : undefined,
        refreshUrl: typeof flow.refreshUrl === 'string' ? flow.refreshUrl : undefined,
        scopes: isStringRecord(flow.scopes) ? flow.scopes : {},
      },
    ];
  });
}

export function getOpenIdConnectUrls(schemes: Record<string, SecuritySchemeObject | ReferenceObject | unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(schemes).flatMap(([name, scheme]) =>
      isSecuritySchemeObject(scheme) && scheme.type === 'openIdConnect' && scheme.openIdConnectUrl ? [[name, scheme.openIdConnectUrl]] : [],
    ),
  );
}

export function mergePreauthorizedCredentials(...configs: Array<PreauthorizeConfig | TryItOutAuthCredentials | undefined>): TryItOutAuthCredentials {
  return configs.reduce<TryItOutAuthCredentials>((merged, config) => {
    if (!config) {
      return merged;
    }

    const credentials = isPreauthorizeConfig(config) ? (config.auth ?? config.credentials ?? {}) : config;
    return { ...merged, ...credentials };
  }, {});
}

export function validateParameterValues(input: ParameterValidationInput): ValidationResult {
  const issues = input.parameters.flatMap((parameter) => {
    if (isReferenceObject(parameter)) {
      return [];
    }

    const value = input.values?.[parameter.name];
    const path = `parameters.${parameter.name}`;

    if (value === undefined || value === null || value === '') {
      return parameter.required ? [{ code: 'required', message: `${parameter.name} is required.`, path }] : [];
    }

    return validateValueAgainstSchema(value, parameter.schema, path);
  });

  return { valid: issues.length === 0, issues };
}

export function validateRequestBody(input: RequestBodyValidationInput): ValidationResult {
  const requestBody = input.requestBody;

  if (!isObject(requestBody) || isReferenceObject(requestBody)) {
    return { valid: true, issues: [] };
  }

  if (input.body === undefined || input.body === null || input.body === '') {
    const issues = requestBody.required ? [{ code: 'required', message: 'Request body is required.', path: 'body' }] : [];
    return { valid: issues.length === 0, issues };
  }

  const mediaType = getRequestBodyMediaType(requestBody, input.contentType);
  const issues = validateValueAgainstSchema(input.body, mediaType?.schema, 'body');
  return { valid: issues.length === 0, issues };
}

export function getSchemaTree(schema: SchemaObject | ReferenceObject | unknown, options: SchemaTreeOptions = {}): SchemaTreeNode {
  return buildSchemaTreeNode(schema, {
    name: options.name ?? 'schema',
    path: options.path ?? '$',
    kind: 'schema',
    required: Boolean(options.required),
    depth: 0,
    maxDepth: options.maxDepth ?? 8,
  });
}

export function getSchemaType(schema: SchemaObject | ReferenceObject | unknown): string | undefined {
  if (!isObject(schema) || isReferenceObject(schema)) {
    return undefined;
  }

  if (Array.isArray(schema.type)) {
    return schema.type.join(' | ');
  }

  if (typeof schema.type === 'string') {
    return schema.nullable ? `${schema.type} | null` : schema.type;
  }

  if (schema.enum) {
    return 'enum';
  }

  if (schema.properties) {
    return 'object';
  }

  if (schema.items) {
    return 'array';
  }

  return undefined;
}

export function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

export function selectServerUrl(
  servers: ServerObject[] = [],
  options: { serverUrl?: string; index?: number; variables?: Record<string, string | number | boolean> } = {},
): string {
  const server = options.serverUrl
    ? { url: options.serverUrl }
    : (servers[options.index ?? 0] ?? servers[0] ?? { url: '/' });

  return substituteServerVariables(server, options.variables);
}

export function substituteServerVariables(server: ServerObject, values: Record<string, string | number | boolean> = {}): string {
  return server.url.replace(/\{([^}]+)\}/g, (_match, variableName: string) => {
    const variable = server.variables?.[variableName];
    const value = values[variableName] ?? variable?.default ?? '';
    return encodeUriPathValue(String(value));
  });
}

export function getServerVariableDefaults(server: ServerObject | undefined): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(server?.variables ?? {}).map(([name, variable]) => [name, variable.default]));
}

export function getServerVariableOptions(server: ServerObject | undefined): NormalizedServerVariable[] {
  return Object.entries(server?.variables ?? {}).map(([name, variable]) => {
    const enumValues = variable.enum ? [...variable.enum] : [];
    return {
      name,
      defaultValue: variable.default,
      enumValues,
      description: variable.description,
      value: variable.default,
      valid: !enumValues.length || enumValues.includes(variable.default),
    };
  });
}

export function normalizeServerVariables(
  server: ServerObject,
  values: Record<string, string | number | boolean> = {},
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(server.variables ?? {}).map(([name, variable]) => {
      const value = values[name] ?? variable.default;
      return [name, variable.enum?.includes(value) === false ? variable.default : value];
    }),
  );
}

export function serializeParameter(parameter: ParameterObject, value: SerializableParameterValue | undefined): SerializedParameterPart[] {
  if (value === undefined || value === null) {
    return [];
  }

  const style = parameter.style ?? getDefaultParameterStyle(parameter.in);
  const explode = parameter.explode ?? (style === 'form' || style === 'deepObject');
  const name = parameter.name;

  if (style === 'deepObject' && isObject(value)) {
    return Object.entries(value).flatMap(([key, item]) => serializeDeepObjectPart(`${name}[${key}]`, item));
  }

  if (style === 'matrix') {
    return [serializeMatrixParameter(name, value, explode)];
  }

  if (style === 'label') {
    return [serializeLabelParameter(name, value, explode)];
  }

  if (Array.isArray(value)) {
    const separator = getParameterSeparator(style);
    if (style === 'simple') {
      return [{ name, value: value.map(stringifyParameterValue).join(separator) }];
    }

    return explode ? value.map((item) => ({ name, value: stringifyParameterValue(item) })) : [{ name, value: value.map(stringifyParameterValue).join(separator) }];
  }

  if (isObject(value)) {
    const entries = Object.entries(value);

    if (style === 'simple') {
      return [
        {
          name,
          value: entries
            .flatMap(([key, item]) => (explode ? [`${key}=${stringifyParameterValue(item)}`] : [key, stringifyParameterValue(item)]))
            .join(','),
        },
      ];
    }

    if (explode) {
      return entries.map(([key, item]) => ({ name: key, value: stringifyParameterValue(item) }));
    }

    const separator = getParameterSeparator(style);
    return [{ name, value: entries.flatMap(([key, item]) => [key, stringifyParameterValue(item)]).join(separator) }];
  }

  return [{ name, value: stringifyParameterValue(value) }];
}

export function buildTryItOutRequest(input: TryItOutRequestInput): TryItOutRequest {
  const headers = normalizeHeaders(input.headers);
  const cookies = normalizeCookies(input.cookies);
  const securitySchemes = input.securitySchemes ?? getDocumentSecuritySchemes(input.document);
  const selectedServerUrl = input.serverUrl ?? (input.server ? substituteServerVariables(input.server, input.serverVariables) : selectServerUrl(input.operation.servers, { variables: input.serverVariables }));
  const baseUrl = trimTrailingSlash(selectedServerUrl);
  let path = input.operation.path;
  const queryParts: SerializedParameterPart[] = [];

  for (const parameter of input.operation.parameters) {
    if (isReferenceObject(parameter)) {
      continue;
    }

    const value = input.parameters?.[parameter.name];
    const parts = serializeParameter(parameter, value);

    if (parameter.in === 'path') {
      path = replacePathParameter(path, parameter.name, parts.map((part) => part.value).join(','));
    } else if (parameter.in === 'query') {
      queryParts.push(...parts);
    } else if (parameter.in === 'header') {
      for (const part of parts) {
        headers[part.name] = part.value;
      }
    } else if (parameter.in === 'cookie') {
      for (const part of parts) {
        cookies[part.name] = part.value;
      }
    }
  }

  applyAuthCredentials({ headers, cookies, queryParts, securitySchemes, credentials: input.auth, requirements: input.operation.security });

  const body = buildRequestBody(input.body, input.contentType);
  if (body.contentType && !hasHeader(headers, 'content-type')) {
    headers['Content-Type'] = body.contentType;
  }

  const url = appendQueryString(`${baseUrl}${path.startsWith('/') || !baseUrl ? path : `/${path}`}`, queryParts);

  const request = {
    method: input.operation.method.toUpperCase() as Uppercase<HttpMethod>,
    url,
    headers,
    cookies,
    body: body.value,
  };

  return input.interceptors?.request ? input.interceptors.request(request, { input }) : request;
}

export function generateCurlSnippet(request: TryItOutRequest): string {
  const args = ['curl', '-X', request.method, shellQuote(request.url)];
  const cookieHeader = Object.entries(request.cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  for (const [name, value] of Object.entries(request.headers)) {
    args.push('-H', shellQuote(`${name}: ${value}`));
  }

  if (cookieHeader) {
    args.push('-H', shellQuote(`Cookie: ${cookieHeader}`));
  }

  if (request.body !== undefined) {
    args.push('--data', shellQuote(request.body));
  }

  return args.join(' \\\n  ');
}

export function generateFetchSnippet(request: TryItOutRequest): string {
  const initEntries = [`method: ${JSON.stringify(request.method)}`];
  const headers = getRequestHeadersWithCookies(request);

  if (Object.keys(headers).length) {
    initEntries.push(`headers: ${JSON.stringify(headers, null, 2)}`);
  }

  if (request.body !== undefined) {
    initEntries.push(`body: ${JSON.stringify(request.body)}`);
  }

  return `fetch(${JSON.stringify(request.url)}, {\n  ${initEntries.join(',\n  ')}\n});`;
}

export function generateHttpieSnippet(request: TryItOutRequest): string {
  const args = ['http', request.method, shellQuote(request.url)];
  const headers = getRequestHeadersWithCookies(request);

  for (const [name, value] of Object.entries(headers)) {
    args.push(shellQuote(`${name}:${value}`));
  }

  if (request.body !== undefined) {
    args.push('--raw', shellQuote(request.body));
  }

  return args.join(' \\\n  ');
}

export function generatePythonSnippet(request: TryItOutRequest): string {
  const lines = ['import requests', '', `response = requests.request(`, `    ${JSON.stringify(request.method)},`, `    ${JSON.stringify(request.url)},`];
  const headers = getRequestHeadersWithCookies(request);

  if (Object.keys(headers).length) {
    lines.push(`    headers=${toPythonLiteral(headers)},`);
  }

  if (request.body !== undefined) {
    lines.push(`    data=${JSON.stringify(request.body)},`);
  }

  lines.push(')');
  return lines.join('\n');
}

export function generateRequestSnippet(request: TryItOutRequest, language: TryItOutRequestSnippetLanguage): string {
  if (language === 'fetch') {
    return generateFetchSnippet(request);
  }

  if (language === 'httpie') {
    return generateHttpieSnippet(request);
  }

  if (language === 'python') {
    return generatePythonSnippet(request);
  }

  return generateCurlSnippet(request);
}

export function applyTryItOutResponseInterceptor(
  response: TryItOutResponse,
  input: TryItOutRequestInput,
  request: TryItOutRequest,
): TryItOutResponse {
  return input.interceptors?.response ? input.interceptors.response(response, { input, request }) : response;
}

function getRequestBodyMediaType(requestBody: RequestBodyObject, preferredContentType?: string): MediaTypeObject | undefined {
  const content = requestBody.content ?? {};
  const bareContentType = preferredContentType?.split(';')[0]?.trim();
  return preferredContentType ? (content[preferredContentType] ?? (bareContentType ? content[bareContentType] : undefined)) : Object.values(content)[0];
}

function validateValueAgainstSchema(value: unknown, schema: SchemaObject | ReferenceObject | unknown, path: string): ValidationIssue[] {
  if (!isObject(schema) || isReferenceObject(schema)) {
    return [];
  }

  if (value === null) {
    return schema.nullable || schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null'))
      ? []
      : [{ code: 'type', message: `${path} must not be null.`, path, expected: getSchemaType(schema), actual: 'null' }];
  }

  if (schema.const !== undefined && value !== schema.const) {
    return [{ code: 'const', message: `${path} must equal ${String(schema.const)}.`, path, expected: String(schema.const), actual: getValueType(value) }];
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return [{ code: 'enum', message: `${path} must be one of the allowed values.`, path, expected: schema.enum.map(String).join(', '), actual: String(value) }];
  }

  const typeIssues = validateSchemaType(value, schema, path);
  if (typeIssues.length) {
    return typeIssues;
  }

  const issues: ValidationIssue[] = [];

  if (Array.isArray(schema.allOf)) {
    issues.push(...schema.allOf.flatMap((item) => validateValueAgainstSchema(value, item, path)));
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((item) => validateValueAgainstSchema(value, item, path).length === 0);
    if (matches.length !== 1) {
      issues.push({ code: 'oneOf', message: `${path} must match exactly one schema.`, path, expected: 'oneOf', actual: `${matches.length} matches` });
    }
  }

  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((item) => validateValueAgainstSchema(value, item, path).length === 0)) {
    issues.push({ code: 'anyOf', message: `${path} must match at least one schema.`, path, expected: 'anyOf', actual: '0 matches' });
  }

  if (schema.not && validateValueAgainstSchema(value, schema.not, path).length === 0) {
    issues.push({ code: 'not', message: `${path} must not match the forbidden schema.`, path, expected: 'not', actual: 'matched' });
  }

  if (Array.isArray(value) && schema.items) {
    issues.push(...value.flatMap((item, index) => validateValueAgainstSchema(item, schema.items, `${path}[${index}]`)));
  }

  if (isObject(value)) {
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : [];
    for (const propertyName of required) {
      if (value[propertyName] === undefined || value[propertyName] === null || value[propertyName] === '') {
        issues.push({ code: 'required', message: `${path}.${propertyName} is required.`, path: `${path}.${propertyName}` });
      }
    }

    if (isObject(schema.properties)) {
      for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
        if (value[propertyName] !== undefined) {
          issues.push(...validateValueAgainstSchema(value[propertyName], propertySchema, `${path}.${propertyName}`));
        }
      }
    }
  }

  return issues;
}

function validateSchemaType(value: unknown, schema: SchemaObject, path: string): ValidationIssue[] {
  const expectedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (!expectedTypes.length) {
    return [];
  }

  const matches = expectedTypes.some((type) => {
    if (type === 'integer') {
      return Number.isInteger(value);
    }
    if (type === 'number') {
      return typeof value === 'number' && Number.isFinite(value);
    }
    if (type === 'array') {
      return Array.isArray(value);
    }
    if (type === 'object') {
      return isObject(value);
    }
    if (type === 'null') {
      return value === null;
    }
    return typeof value === type;
  });

  return matches
    ? []
    : [{ code: 'type', message: `${path} must be ${expectedTypes.join(' or ')}.`, path, expected: expectedTypes.join(' or '), actual: getValueType(value) }];
}

function mergeParameters(pathParameters: Array<ParameterObject | ReferenceObject> = [], operationParameters: Array<ParameterObject | ReferenceObject> = []) {
  const merged = new Map<string, ParameterObject | ReferenceObject>();

  for (const parameter of [...pathParameters, ...operationParameters]) {
    merged.set(getParameterKey(parameter), parameter);
  }

  return [...merged.values()];
}

function cloneViewerConfig(config: ResolvedViewerConfig): ResolvedViewerConfig {
  return {
    ...config,
    supportedSubmitMethods: [...config.supportedSubmitMethods],
    plugins: [...config.plugins],
    syntaxHighlight: isObject(config.syntaxHighlight) ? { ...config.syntaxHighlight } : config.syntaxHighlight,
  };
}

function mergeSyntaxHighlightConfig(
  current: ResolvedViewerConfig['syntaxHighlight'],
  next: ViewerConfig['syntaxHighlight'],
): ResolvedViewerConfig['syntaxHighlight'] {
  if (next === undefined) {
    return isObject(current) ? { ...current } : current;
  }

  if (typeof next === 'boolean') {
    return next;
  }

  if (typeof current === 'boolean') {
    return { ...next };
  }

  return { ...current, ...next };
}

function getOperationSorter(sorter: ViewerConfig['operationsSorter']): (left: NormalizedOperation, right: NormalizedOperation) => number {
  if (typeof sorter === 'function') {
    return sorter;
  }

  if (sorter === 'alpha') {
    return (left, right) => compareText(getOperationDisplayName(left), getOperationDisplayName(right));
  }

  if (sorter === 'method') {
    return (left, right) => HTTP_METHODS.indexOf(left.method) - HTTP_METHODS.indexOf(right.method) || compareText(left.path, right.path);
  }

  return () => 0;
}

function getTagSorter(sorter: ViewerConfig['tagsSorter']): (left: OperationTagGroup, right: OperationTagGroup) => number {
  if (typeof sorter === 'function') {
    return sorter;
  }

  if (sorter === 'alpha') {
    return (left, right) => compareText(left.name, right.name);
  }

  return () => 0;
}

function getOperationDisplayName(operation: NormalizedOperation) {
  return operation.operationId ?? operation.summary ?? operation.path;
}

function compareText(left: string | undefined, right: string | undefined) {
  return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
}

function getDefaultParameterStyle(location: ParameterObject['in']): ParameterStyle {
  return location === 'path' || location === 'header' ? 'simple' : 'form';
}

function getParameterSeparator(style: ParameterStyle) {
  if (style === 'spaceDelimited') {
    return ' ';
  }

  if (style === 'pipeDelimited') {
    return '|';
  }

  return ',';
}

function serializeMatrixParameter(name: string, value: SerializableParameterValue, explode: boolean): SerializedParameterPart {
  if (Array.isArray(value)) {
    const serialized = value.map(stringifyParameterValue);
    return { name, value: explode ? serialized.map((item) => `;${name}=${item}`).join('') : `;${name}=${serialized.join(',')}` };
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    return {
      name,
      value: explode
        ? entries.map(([key, item]) => `;${key}=${stringifyParameterValue(item)}`).join('')
        : `;${name}=${entries.flatMap(([key, item]) => [key, stringifyParameterValue(item)]).join(',')}`,
    };
  }

  return { name, value: `;${name}=${stringifyParameterValue(value)}` };
}

function serializeLabelParameter(name: string, value: SerializableParameterValue, explode: boolean): SerializedParameterPart {
  if (Array.isArray(value)) {
    return { name, value: `.${value.map(stringifyParameterValue).join(explode ? '.' : ',')}` };
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    return {
      name,
      value: `.${entries
        .flatMap(([key, item]) => (explode ? [`${key}=${stringifyParameterValue(item)}`] : [key, stringifyParameterValue(item)]))
        .join(explode ? '.' : ',')}`,
    };
  }

  return { name, value: `.${stringifyParameterValue(value)}` };
}

function serializeDeepObjectPart(name: string, value: unknown): SerializedParameterPart[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => ({ name, value: stringifyParameterValue(item) }));
  }

  if (isObject(value)) {
    return Object.entries(value).flatMap(([key, item]) => serializeDeepObjectPart(`${name}[${key}]`, item));
  }

  return [{ name, value: stringifyParameterValue(value) }];
}

function stringifyParameterValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function replacePathParameter(path: string, name: string, value: string) {
  const encodedValue = encodePathParameterValue(value);
  return path.replace(new RegExp(`\\{${escapeRegExp(name)}\\}`, 'g'), encodedValue);
}

function appendQueryString(url: string, parts: SerializedParameterPart[]) {
  const query = parts
    .map((part) => `${encodeURIComponent(part.name)}=${encodeURIComponent(part.value)}`)
    .join('&');

  if (!query) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

function applyAuthCredentials({
  headers,
  cookies,
  queryParts,
  securitySchemes,
  credentials = {},
  requirements,
}: {
  headers: Record<string, string>;
  cookies: Record<string, string>;
  queryParts: SerializedParameterPart[];
  securitySchemes: Record<string, SecuritySchemeObject | ReferenceObject | unknown>;
  credentials?: TryItOutAuthCredentials;
  requirements: SecurityRequirementObject[];
}) {
  const requiredSchemeNames = new Set(requirements.flatMap((requirement) => Object.keys(requirement)));
  const schemeNames = requiredSchemeNames.size ? [...requiredSchemeNames] : Object.keys(credentials);

  for (const schemeName of schemeNames) {
    const credential = credentials[schemeName];
    const scheme = securitySchemes[schemeName];

    if (!credential || !isSecuritySchemeObject(scheme)) {
      continue;
    }

    if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic' && isBasicAuthCredentials(credential)) {
      headers.Authorization = `Basic ${encodeBase64(`${credential.username}:${credential.password}`)}`;
      continue;
    }

    if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer') {
      headers.Authorization = `Bearer ${getCredentialValue(credential)}`;
      continue;
    }

    if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') {
      const tokenType = isTokenAuthCredentials(credential) ? (credential.tokenType ?? 'Bearer') : 'Bearer';
      headers.Authorization = `${tokenType} ${getCredentialValue(credential)}`;
      continue;
    }

    if (scheme.type === 'apiKey' && scheme.name) {
      const value = getCredentialValue(credential);
      if (scheme.in === 'header') {
        headers[scheme.name] = value;
      } else if (scheme.in === 'query') {
        queryParts.push({ name: scheme.name, value });
      } else if (scheme.in === 'cookie') {
        cookies[scheme.name] = value;
      }
    }
  }
}

function buildRequestBody(body: unknown, contentType?: string): { value?: string; contentType?: string } {
  if (body === undefined) {
    return {};
  }

  if (typeof body === 'string') {
    return { value: body, contentType };
  }

  if (body instanceof URLSearchParams) {
    return { value: body.toString(), contentType: contentType ?? 'application/x-www-form-urlencoded' };
  }

  return { value: JSON.stringify(body), contentType: contentType ?? 'application/json' };
}

function normalizeHeaders(headers: Record<string, string | undefined> = {}) {
  return Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

function normalizeCookies(cookies: Record<string, string | undefined> = {}) {
  return Object.fromEntries(Object.entries(cookies).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

function hasHeader(headers: Record<string, string>, name: string) {
  const normalizedName = name.toLowerCase();
  return Object.keys(headers).some((headerName) => headerName.toLowerCase() === normalizedName);
}

function getCredentialValue(credential: SecurityCredential) {
  if (typeof credential === 'string') {
    return credential;
  }

  if (isBasicAuthCredentials(credential)) {
    return `${credential.username}:${credential.password}`;
  }

  return credential.value;
}

function isBasicAuthCredentials(value: SecurityCredential): value is BasicAuthCredentials {
  const candidate = value as Partial<BasicAuthCredentials>;
  return isObject(value) && typeof candidate.username === 'string' && typeof candidate.password === 'string';
}

function isTokenAuthCredentials(value: SecurityCredential): value is TokenAuthCredentials {
  return isObject(value) && 'value' in value && typeof value.value === 'string';
}

function isPreauthorizeConfig(value: PreauthorizeConfig | TryItOutAuthCredentials): value is PreauthorizeConfig {
  return isObject(value) && ('auth' in value || 'credentials' in value);
}

function isSecuritySchemeObject(value: unknown): value is SecuritySchemeObject {
  return isObject(value) && typeof value.type === 'string' && !isReferenceObject(value);
}

function getDocumentSecuritySchemes(document: OpenAPIObject | undefined): Record<string, SecuritySchemeObject | ReferenceObject | unknown> {
  return getSecuritySchemes(document);
}

function encodeBase64(value: string) {
  if (typeof btoa === 'function') {
    return btoa(value);
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  for (let index = 0; index < value.length; index += 3) {
    const first = value.charCodeAt(index);
    const second = value.charCodeAt(index + 1);
    const third = value.charCodeAt(index + 2);
    const triplet = (first << 16) | ((Number.isNaN(second) ? 0 : second) << 8) | (Number.isNaN(third) ? 0 : third);

    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += Number.isNaN(second) ? '=' : alphabet[(triplet >> 6) & 63];
    output += Number.isNaN(third) ? '=' : alphabet[triplet & 63];
  }

  return output;
}

function encodeUriPathValue(value: string) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function encodePathParameterValue(value: string) {
  return encodeUriPathValue(value)
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=')
    .replace(/%2C/gi, ',')
    .replace(/%2E/gi, '.');
}

function trimTrailingSlash(value: string) {
  return value.length > 1 ? value.replace(/\/+$/, '') : value;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function getRequestHeadersWithCookies(request: TryItOutRequest) {
  const cookieHeader = Object.entries(request.cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  return cookieHeader ? { ...request.headers, Cookie: cookieHeader } : { ...request.headers };
}

function toPythonLiteral(value: Record<string, string>) {
  const entries = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`);
  return `{${entries.join(', ')}}`;
}

function getParameterKey(parameter: ParameterObject | ReferenceObject) {
  return isReferenceObject(parameter) ? parameter.$ref : `${parameter.in}:${parameter.name}`;
}

function getParameterNames(parameters: Array<ParameterObject | ReferenceObject>) {
  return parameters.map((parameter) => (isReferenceObject(parameter) ? getRefName(parameter.$ref) : parameter.name)).filter(Boolean);
}

function getResponseSortValue(statusCode: string) {
  if (statusCode.toLowerCase() === 'default') {
    return 1000;
  }

  const parsed = Number.parseInt(statusCode, 10);
  return Number.isFinite(parsed) ? parsed : 1001;
}

function getOperationServers(document: OpenAPIObject, pathItem: PathItemObject, operation: OperationObject) {
  if (operation.servers) {
    return operation.servers;
  }

  if (pathItem.servers) {
    return pathItem.servers;
  }

  if (document.servers) {
    return document.servers;
  }

  if (document.swagger === '2.0') {
    const scheme = document.schemes?.[0] ?? 'https';
    const host = document.host ?? '';
    const basePath = document.basePath ?? '';
    return [{ url: host ? `${scheme}://${host}${basePath}` : basePath || '/' }];
  }

  return [];
}

function getOperationContentTypes(operation: OperationObject, document: OpenAPIObject) {
  const contentTypes = new Set<string>();

  for (const contentType of getRequestBodyMediaTypes(operation, document)) {
    contentTypes.add(contentType);
  }

  for (const response of Object.values(operation.responses ?? {})) {
    if (isObject(response) && !isReferenceObject(response) && isObject(response.content)) {
      for (const contentType of Object.keys(response.content)) {
        contentTypes.add(contentType);
      }
    }
  }

  for (const contentType of operation.produces ?? document.produces ?? []) {
    contentTypes.add(contentType);
  }

  return [...contentTypes];
}

function getOperationSchemaNames(operation: OperationObject, responses: Record<string, ResponseObject | ReferenceObject | unknown>) {
  const names = new Set<string>();
  collectSchemaNames(operation.requestBody, names);
  collectSchemaNames(operation.parameters, names);
  collectSchemaNames(responses, names);
  return [...names];
}

function collectSchemaNames(value: unknown, names: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaNames(item, names);
    }
    return;
  }

  if (!isObject(value)) {
    return;
  }

  if (isReferenceObject(value)) {
    names.add(getRefName(value.$ref));
    return;
  }

  for (const key of ['schema', 'items', 'additionalProperties', 'allOf', 'oneOf', 'anyOf', 'not', 'content', 'properties']) {
    collectSchemaNames(value[key], names);
  }
}

function buildSearchText({
  method,
  path,
  tags,
  operation,
  parameters,
  responses,
  contentTypes,
  parameterNames,
  schemaNames,
}: {
  method: HttpMethod;
  path: string;
  tags: string[];
  operation: OperationObject;
  parameters: Array<ParameterObject | ReferenceObject>;
  responses: Record<string, unknown>;
  contentTypes: string[];
  parameterNames: string[];
  schemaNames: string[];
}) {
  return [
    method,
    path,
    ...tags,
    operation.summary,
    operation.description,
    operation.operationId,
    ...parameterNames,
    ...parameters.map((parameter) => (isReferenceObject(parameter) ? parameter.$ref : parameter.description)),
    ...Object.keys(responses),
    ...contentTypes,
    ...schemaNames,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildSchemaExample(schema: unknown, depth: number, maxDepth: number, requiredOnly: boolean): unknown {
  if (!isObject(schema) || isReferenceObject(schema) || depth > maxDepth) {
    return undefined;
  }

  if ('example' in schema) {
    return schema.example;
  }

  if ('default' in schema) {
    return schema.default;
  }

  if (Array.isArray(schema.examples) && schema.examples.length) {
    return schema.examples[0];
  }

  if (schema.const !== undefined) {
    return schema.const;
  }

  if (Array.isArray(schema.enum) && schema.enum.length) {
    return schema.enum[0];
  }

  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  const oneOf = Array.isArray(schema.oneOf) ? schema.oneOf : [];
  const anyOf = Array.isArray(schema.anyOf) ? schema.anyOf : [];
  const combinedSchema = [...allOf, ...oneOf, ...anyOf].find((item) => !isReferenceObject(item));
  if (combinedSchema) {
    return buildSchemaExample(combinedSchema, depth + 1, maxDepth, requiredOnly);
  }

  const schemaType = getSchemaType(schema);

  if (schemaType === 'object' || isObject(schema.properties)) {
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const entries = Object.entries(schema.properties ?? {}).filter(([propertyName]) => !requiredOnly || required.has(propertyName));

    return entries.reduce<Record<string, unknown>>((example, [propertyName, propertySchema]) => {
      example[propertyName] = buildSchemaExample(propertySchema, depth + 1, maxDepth, requiredOnly);
      return example;
    }, {});
  }

  if (schemaType === 'array') {
    return [buildSchemaExample(schema.items, depth + 1, maxDepth, requiredOnly)];
  }

  if (schemaType?.includes('integer') || schemaType?.includes('number')) {
    return 0;
  }

  if (schemaType?.includes('boolean')) {
    return false;
  }

  if (schema.nullable || (Array.isArray(schema.type) && schema.type.includes('null'))) {
    return null;
  }

  return '';
}

function buildSchemaTreeNode(
  schema: unknown,
  context: { name: string; path: string; kind: SchemaTreeNodeKind; required: boolean; depth: number; maxDepth: number },
): SchemaTreeNode {
  const ref = isReferenceObject(schema) ? schema.$ref : undefined;
  const schemaObject = isObject(schema) && !isReferenceObject(schema) ? schema : {};
  const requiredProperties = new Set(Array.isArray(schemaObject.required) ? schemaObject.required.filter((item): item is string => typeof item === 'string') : []);
  const type = getSchemaType(schema);
  const children: SchemaTreeNode[] = [];

  if (context.depth < context.maxDepth && !ref) {
    if (isObject(schemaObject.properties)) {
      for (const [propertyName, propertySchema] of Object.entries(schemaObject.properties)) {
        children.push(
          buildSchemaTreeNode(propertySchema, {
            name: propertyName,
            path: `${context.path}.${propertyName}`,
            kind: 'property',
            required: requiredProperties.has(propertyName),
            depth: context.depth + 1,
            maxDepth: context.maxDepth,
          }),
        );
      }
    }

    if (schemaObject.items) {
      children.push(
        buildSchemaTreeNode(schemaObject.items, {
          name: 'items',
          path: `${context.path}[]`,
          kind: 'array-item',
          required: true,
          depth: context.depth + 1,
          maxDepth: context.maxDepth,
        }),
      );
    }

    if (isObject(schemaObject.additionalProperties)) {
      children.push(
        buildSchemaTreeNode(schemaObject.additionalProperties, {
          name: 'additionalProperties',
          path: `${context.path}.*`,
          kind: 'additional-properties',
          required: false,
          depth: context.depth + 1,
          maxDepth: context.maxDepth,
        }),
      );
    }

    for (const key of ['allOf', 'oneOf', 'anyOf'] as const) {
      const items = Array.isArray(schemaObject[key]) ? schemaObject[key] : [];
      items.forEach((item, index) => {
        children.push(
          buildSchemaTreeNode(item, {
            name: `${key}[${index}]`,
            path: `${context.path}.${key}[${index}]`,
            kind: 'composition',
            required: context.required,
            depth: context.depth + 1,
            maxDepth: context.maxDepth,
          }),
        );
      });
    }
  }

  return {
    id: context.path,
    name: context.name,
    path: context.path,
    kind: ref ? 'reference' : context.kind,
    type,
    format: typeof schemaObject.format === 'string' ? schemaObject.format : undefined,
    description: typeof schemaObject.description === 'string' ? schemaObject.description : undefined,
    required: context.required,
    nullable: Boolean(schemaObject.nullable) || (Array.isArray(schemaObject.type) && schemaObject.type.includes('null')),
    deprecated: Boolean(schemaObject.deprecated),
    readOnly: Boolean(schemaObject.readOnly),
    writeOnly: Boolean(schemaObject.writeOnly),
    ref,
    enumValues: Array.isArray(schemaObject.enum) ? schemaObject.enum : undefined,
    example: getSchemaExample(schema),
    children,
    schema,
  };
}

function resolveValue(value: unknown, root: unknown, stack: Set<string>, depth: number, maxDepth: number, preserveRefs: boolean): unknown {
  if (depth > maxDepth || !isObject(value)) {
    return value;
  }

  if (isReferenceObject(value)) {
    const resolved = resolveInternalReference(root, value.$ref);
    if (!resolved || stack.has(value.$ref)) {
      return value;
    }

    const nextStack = new Set(stack).add(value.$ref);
    const resolvedValue = resolveValue(resolved.value, root, nextStack, depth + 1, maxDepth, preserveRefs);

    if (preserveRefs && isObject(resolvedValue)) {
      return { ...resolvedValue, ...value };
    }

    return resolvedValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, root, stack, depth + 1, maxDepth, preserveRefs));
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, root, stack, depth + 1, maxDepth, preserveRefs)]));
}

function getJsonPointer(value: unknown, pointer: string) {
  if (pointer === '') {
    return value;
  }

  return pointer
    .split('/')
    .slice(1)
    .reduce<unknown>((current, segment) => {
      if (!isObject(current) && !Array.isArray(current)) {
        return undefined;
      }

      return (current as Record<string, unknown>)[decodePointerSegment(segment)];
    }, value);
}

function decodePointerSegment(segment: string) {
  return decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~');
}

function asPathItem(value: PathItemObject | undefined): PathItemObject | undefined {
  if (!value || isReferenceObject(value)) {
    return undefined;
  }

  return value;
}

function getVendorExtensions(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key.startsWith('x-')));
}

function getRefName(ref: string) {
  return decodePointerSegment(ref.split('/').pop() ?? ref);
}

function isReferenceObject(value: unknown): value is ReferenceObject {
  return isObject(value) && typeof value.$ref === 'string' && Object.keys(value).every((key) => key === '$ref' || key === 'summary' || key === 'description');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isObject(value) && Object.values(value).every((item) => typeof item === 'string');
}

function getValueType(value: unknown) {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  if (Number.isInteger(value)) {
    return 'integer';
  }

  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
