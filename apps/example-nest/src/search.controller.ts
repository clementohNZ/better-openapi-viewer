import { Body, Controller, Delete, Get, Headers, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
  @Get()
  @ApiQuery({ name: 'q', required: true, description: 'Search query.' })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated resource types to search.', example: 'products,orders,users' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  @ApiHeader({ name: 'x-search-session', required: false, description: 'Session ID for tracking search analytics.' })
  @ApiOkResponse({
    description: 'Multi-resource search results.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        results: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              data: { type: 'array', items: { type: 'object' } },
            },
          },
        },
        totalResults: { type: 'integer' },
        tookMs: { type: 'number' },
      },
    },
  })
  search(@Query('q') q: string, @Headers('x-search-session') session?: string) {
    return { query: q, results: {}, totalResults: 0, tookMs: 0 };
  }

  @Post('advanced')
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'object',
          description: 'Elasticsearch-style query DSL.',
          properties: {
            bool: {
              type: 'object',
              properties: {
                must: { type: 'array', items: { type: 'object' } },
                should: { type: 'array', items: { type: 'object' } },
                mustNot: { type: 'array', items: { type: 'object' } },
                filter: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        index: { type: 'string', enum: ['products', 'orders', 'users', 'all'], default: 'all' },
        from: { type: 'integer', default: 0 },
        size: { type: 'integer', default: 20 },
        sort: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: { type: 'object', properties: { order: { type: 'string', enum: ['asc', 'desc'] } } },
          },
        },
        highlight: { type: 'boolean', default: true },
        aggregations: { type: 'object', additionalProperties: true },
      },
    },
  })
  @ApiOkResponse({ description: 'Advanced search results with aggregations.' })
  advancedSearch(@Body() body: any) {
    return { hits: [], total: 0, tookMs: 0, aggregations: {} };
  }

  @Get('suggestions')
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['products', 'categories', 'brands', 'users'] })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 8, maximum: 20 } })
  @ApiOkResponse({
    description: 'Autocomplete suggestions.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          type: { type: 'string' },
          id: { type: 'string', nullable: true },
          score: { type: 'number' },
        },
      },
    },
  })
  getSuggestions(@Query('q') q: string) {
    return [];
  }

  @Get('recent')
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 10 } })
  @ApiOkResponse({
    description: 'Recent searches for the current user.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          resultCount: { type: 'integer' },
          searchedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  getRecentSearches() {
    return [];
  }

  @Delete('recent')
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Recent search history cleared.' })
  clearRecentSearches() {
    return;
  }

  @Get('filters')
  @ApiQuery({ name: 'index', required: false, enum: ['products', 'orders', 'users'], schema: { default: 'products' } })
  @ApiOkResponse({
    description: 'Available search filters for a given index.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          label: { type: 'string' },
          type: { type: 'string', enum: ['text', 'number', 'date', 'boolean', 'enum'] },
          operators: { type: 'array', items: { type: 'string', enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'contains', 'between'] } },
          options: { type: 'array', items: { type: 'object', properties: { value: {}, label: { type: 'string' } } }, nullable: true },
        },
      },
    },
  })
  getFilters() {
    return [];
  }
}
