export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export type OpenAPIObject = {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  servers?: ServerObject[];
  paths?: Record<string, PathItemObject | undefined>;
  components?: unknown;
  tags?: Array<{ name: string; description?: string }>;
  security?: SecurityRequirementObject[];
};

export type ServerObject = {
  url: string;
  description?: string;
  variables?: Record<string, { default: string | number | boolean; enum?: Array<string | number | boolean>; description?: string }>;
};

export type SecurityRequirementObject = Record<string, string[]>;

export type PathItemObject = {
  summary?: string;
  description?: string;
  servers?: ServerObject[];
  parameters?: Array<ParameterObject | ReferenceObject>;
} & Partial<Record<HttpMethod, OperationObject>>;

export type OperationObject = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  parameters?: Array<ParameterObject | ReferenceObject>;
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
};

export type ParameterObject = {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: unknown;
  example?: unknown;
  examples?: Record<string, unknown>;
};

export type ReferenceObject = {
  $ref: string;
  summary?: string;
  description?: string;
};

export type NormalizedOperation = {
  id: string;
  method: HttpMethod;
  path: string;
  tags: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated: boolean;
  parameters: Array<ParameterObject | ReferenceObject>;
  responses: Record<string, unknown>;
  security: SecurityRequirementObject[];
  servers: ServerObject[];
  searchText: string;
};

const HTTP_METHODS: HttpMethod[] = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

export function getOperations(document: OpenAPIObject): NormalizedOperation[] {
  return Object.entries(document.paths ?? {}).flatMap(([path, pathItem]) => {
    if (!pathItem) {
      return [];
    }

    return HTTP_METHODS.flatMap((method) => {
      const operation = pathItem[method];
      if (!operation) {
        return [];
      }

      const tags = operation.tags?.length ? operation.tags : ['default'];
      const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
      const responses = operation.responses ?? {};
      const servers = operation.servers ?? pathItem.servers ?? document.servers ?? [];
      const security = operation.security ?? document.security ?? [];
      const id = operation.operationId ?? `${method}:${path}`;

      return [
        {
          id,
          method,
          path,
          tags,
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
          deprecated: Boolean(operation.deprecated),
          parameters,
          responses,
          security,
          servers,
          searchText: buildSearchText({
            method,
            path,
            tags,
            operation,
            parameters,
            responses,
          }),
        },
      ];
    });
  });
}

export function searchOperations(operations: NormalizedOperation[], query: string): NormalizedOperation[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return operations;
  }

  return operations.filter((operation) => operation.searchText.includes(normalizedQuery));
}

function buildSearchText({
  method,
  path,
  tags,
  operation,
  parameters,
  responses,
}: {
  method: HttpMethod;
  path: string;
  tags: string[];
  operation: OperationObject;
  parameters: Array<ParameterObject | ReferenceObject>;
  responses: Record<string, unknown>;
}) {
  return [
    method,
    path,
    ...tags,
    operation.summary,
    operation.description,
    operation.operationId,
    ...parameters.map((parameter) => ('$ref' in parameter ? parameter.$ref : parameter.name)),
    ...Object.keys(responses),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
