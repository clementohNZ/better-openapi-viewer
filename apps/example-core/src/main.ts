import {
  buildTryItOutRequest,
  detectOpenApiVersion,
  filterOperations,
  generateRequestSnippet,
  groupOperationsByTag,
  normalizeOpenApiDocument,
  searchOperations,
  validateOpenApiDocument,
  validateParameterValues,
  type NormalizedOperation,
} from '@clementoh/better-openapi-viewer-core';

import { document } from './openapi.js';

function heading(text: string) {
  console.log(`\n=== ${text} ===`);
}

function describeOperation(operation: NormalizedOperation): string {
  const summary = operation.summary ? ` — ${operation.summary}` : '';
  return `  ${operation.method.toUpperCase().padEnd(6)} ${operation.path}${summary}`;
}

heading('Document version & validity');
console.log('Detected version:', detectOpenApiVersion(document));
const issues = validateOpenApiDocument(document);
console.log('Issues:', issues.length === 0 ? 'none' : issues);

heading('Normalized operations');
const normalized = normalizeOpenApiDocument(document);
console.log(`${normalized.operations.length} operations across ${normalized.tags.length} tags.`);
for (const operation of normalized.operations) {
  console.log(describeOperation(operation));
}

heading('Grouped by tag');
const grouped = groupOperationsByTag(normalized.operations, normalized.tags);
for (const group of grouped) {
  console.log(`# ${group.name} (${group.operations.length})`);
  for (const operation of group.operations) {
    console.log(describeOperation(operation));
  }
}

heading('Search & filter');
const search = searchOperations(normalized.operations, 'order');
console.log(`searchOperations("order") → ${search.length} match(es)`);
for (const operation of search) {
  console.log(describeOperation(operation));
}

const requireAuth = filterOperations(normalized.operations, { auth: 'required' });
console.log(`\nfilterOperations({ auth: 'required' }) → ${requireAuth.length} match(es)`);
for (const operation of requireAuth) {
  console.log(describeOperation(operation));
}

heading('Parameter validation');
const listBooks = normalized.operations.find((op) => op.operationId === 'listBooks');
if (listBooks) {
  const missing = validateParameterValues({ parameters: listBooks.parameters, values: {} });
  console.log('listBooks with no values →', missing);

  const valid = validateParameterValues({
    parameters: listBooks.parameters,
    values: { q: 'asimov', limit: 10 },
  });
  console.log('listBooks with valid values →', valid);
}

heading('Try It Out request + snippets');
const getBook = normalized.operations.find((op) => op.operationId === 'getBook');
if (getBook) {
  const request = buildTryItOutRequest({
    document,
    operation: getBook,
    parameters: { bookId: '7d3a0b2e-4c4f-4a3e-9c47-6d6e9e2b9b1a' },
  });
  console.log('Request:', request);
  console.log('\ncurl:\n' + generateRequestSnippet(request, 'curl'));
  console.log('\nfetch:\n' + generateRequestSnippet(request, 'fetch'));
}

const createOrder = normalized.operations.find((op) => op.operationId === 'createOrder');
if (createOrder) {
  const request = buildTryItOutRequest({
    document,
    operation: createOrder,
    body: { bookId: '7d3a0b2e-4c4f-4a3e-9c47-6d6e9e2b9b1a', quantity: 2 },
    contentType: 'application/json',
    auth: { bearerAuth: { value: 'demo-token' } },
  });
  console.log('\nAuthenticated POST request:', request);
  console.log('\ncurl:\n' + generateRequestSnippet(request, 'curl'));
}
